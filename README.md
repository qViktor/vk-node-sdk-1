# vk-node-sdk
Библиотека для работы с [VK API](https://vk.com/dev) для сообществ, пользователей и приложений. Прежде чем начать использование библиотеки, получите access_token для пользователя,сообщества или приложения как описано [тут](https://vk.com/dev/access_token). Создайте сообщество на [этой](https://vk.com/groups) странице если оно ещё не создано или приложение [тут](https://vk.com/apps?act=manage)

#### Главные преимущества этой библиотеки

- Библиотека позволяет выполнять запросы от имени группы, так и от имени пользователя, что позволяет выполнять методы, недоступные для вызова от имени группы, например: [wall.deleteComment](https://vk.com/dev/wall.deleteComment)

- Все вызванные методы помещаются в очередь и последовательно выполняются через метод [execute](https://vk.com/dev/execute) (который за один запрос может обработать до 25 методов). Это позволяет оптимизировать количество запросов к серверам VK и не превышать лимиты на количество запросов в секунду.

- Возможность отправки медиа-вложения из URL.

- Возможность создания сценариев вопросов и ответов 

- Разделение сообщении по типу (только с текстом/с фото/с документом).

- Получение и обработка событий из [Callback API](https://vk.com/dev/callback_api) + автоматическая настройка сервера [Callback API](https://vk.com/dev/callback_api).

- Удобная работа с [Streaming API](https://vk.com/dev/streaming_api)

# Установка
```
npm install vk-node-sdk
```

# Простые примеры

Тут мы получаем новые сообщения присланные в сообщество и отвечаем на некоторые из них:

```javascript
const VK = require('vk-node-sdk')
const Group = new VK.Group('GROUP_TOKEN') // Подробнее: https://vk.com/dev/access_token

Group.onMessage((message) => {
  console.log('new message', message.toJSON())
  message.setTyping() // Отправляем статус "печатает"
  switch(message.body) {
    case 'пинг':
      message.addText('понг').send()
      break
    case 'фото':
      message.addPhoto('https://vk.com/images/gift/875/256_1.jpg').send()
      break
    case 'документ':
      message.addPhoto('http://vk.com/images/gift/875/256.mp4').send()
      break
    case 'ответ':
      message.addText('сообщение').addForward(message.id).send()
      break
  }
})

Group.onCommand('/help', (message) => { // Пример использование комманды
  message.addText('Это тестовый бот для проверки библиотеки vk-node-sdk.').send()
})
```

#### Результат:

![](https://raw.githubusercontent.com/AntDev95/vk-node-sdk/master/ChatScreen.png)

### Пример голосового бота:

В этом примере используется синтезатор речи от Yandex.
Для этого нужо получить **бесплатный** ключ для использования Yandex SpeechKit Cloud 
Подробнее тут: https://tech.yandex.ru/speechkit/cloud/

В примере показано как загружать файлы на ВК с внешних ресурсов не сохраняя их у себя на сервере.

Так же показано как загружать mp3 или wav файл как аудио сообщение на ВКонтакте.

```javascript
const VK = require('vk-node-sdk')
const Group = new VK.Group('GROUP_TOKEN')

/**
 * Бесплатный ключ Yandex SpeechKit Cloud
 * Получить тут: developer.tech.yandex.ru/keys/ и вставить в эту переменную
 */
const YANDEX_KEY = 'f2cf48cd-7f44-4e56-a8ca-60c7dc3381d9'


/**
 * Получаем все сообщения которые содержат текст
 */
Group.onMessageText((message) => {
  if (message.body.length > 200) {
    message.addText('В сообщении должно быть не больше 200 символов').send()
  } else {
    message.setTyping()
    /**
     * Выполняем запрос к Yandex API
     */
    VK.Utils.getBuffer('https://tts.voicetech.yandex.net/generate', {text: message.body, format: 'mp3', lang: 'ru', speaker: 'zahar', key: YANDEX_KEY}, (buffer, response) => {
        /**
         * Получем данные и проверяем заголовки
         * content-type: audio/mpeg - значить что Yandex API вернул аудиофайл в ответ
         * Создаем объект файла и загружаем голосовое сообщение на ВК
         */
        if (response && response.headers['content-type'] == 'audio/mpeg') {
          let file = { // Создаем объект файла
              buffer: buffer, // buffer - полученное аудио c Yandex API
              filename: 'file.mp3', // имя файла, например: file.wav
              mimetype: 'audio/mpeg' // mimetype файла, для аудио - audio/mpeg. Список: vk.cc/70vqHm
            }
            /**
             * Первый аргумент (file) наш объект файла
             * Второй аргумент ('file_name') название файла на ВК
             */
          message.addVoice(file, 'file_name.mp3').send()
        } else {
          message.addText('Упс, не удалось озвучить текст').send()
        }
      })
  }
})


/**
 * Все остальные сообщения которые мы не обрабатываем
 * Например сообщения с фото
 */
Group.onMessage((message) => {
  message.addText('Пришли мне текстовое сообщение').send()
})
```

Или пример с получением новых комментариев и автоматическое удаление комментариев от сообществ:

```javascript
const VK = require('vk-node-sdk')

const User = new VK.User('USER_TOKEN')
const Group = new VK.Group('GROUP_TOKEN', {
  webhook: {
    url: 'http://SERVER_IP/callback',
    port: 80
  }
})

Bot.onCallBackEvent('wall_reply_new', (comment) => {
  // У сообществ id всегда меньше 0.
  // Второе условие нужно, чтобы не удалять комментарии от своей группы.
  if (comment.from_id < 0 && comment.from_id != Group.Id) {
    User.api('wall.deleteComment', {
      owner_id: comment.post_owner_id,
      comment_id: comment.id
    })
  }
})
```
В итоге все комментарии от сообществ будут автоматически удаляться.

# Инициализация

```javascript
const VK = require('vk-node-sdk')

// Для сообщества с указанием Callback сервера
const Group = new VK.Group('GROUP_TOKEN', {
  webhook: {
    url: 'http://SERVER_IP/callback',
    port: 80
  }
})

// Для пользователя
const User = new VK.User('USER_TOKEN')

// Для приложения
const App = new VK.App('APP_TOKEN')
```

*Если вы используете другой порт для Callback сервера, настройте его проксирование через ваш веб-сервер. Документация для
[Nginx](http://nginx.org/ru/docs/http/ngx_http_proxy_module.html) и [Apache](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html#proxypass)*

[Подробнее о настройке callback сервера с помощью nginx на ubuntu](https://github.com/AntDev95/vk-node-sdk/wiki/Настройка-Callback-API-сервера)

# Объект VK.Group
Этот объект предназначен для работы с VK API от имени сообщества.
Позволяет получать новые сообщения и новые события в сообществе через Callback API

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| access_token | string или array | Да | Ключ доступа к сообществу или список ключей. |
| options | object | Нет | Параметры. Например параметр *webhook* указывает данные для Callback API |

#### Методы:
- [Group.onMessage(callback)](#grouponmessagecallback)
- [Group.onCommand(command, callback)](#grouponcommandcommand-callback)
- [Group.onTypingStatusChange(callback)](#groupontypingstatuschangecallback)
- [Group.onCallBackEvent(event, callback)](#grouponcallbackeventevent-callback)
- [Group.api(method, params, callback)](#groupapimethod-params-callback)
- [Group.isMember(user_id, callback)](#groupismemberuser_id-callback)
- [Group.sendMessage(params, callback)](#groupsendmessageparams-callback)
- [Group.photoUpload(peer_id, file, callback)](#groupphotouploadpeer_id-file-callback)
- [Group.docUpload(peer_id, file, callback, type)](#groupdocuploadpeer_id-file-callback-type)
- [Group.coverUpload(file, callback, params)](#groupcoveruploadfile-callback-params)
- [Group.messageGet(message_id, callback)](#groupmessagegetmessage_id-callback)
- [Group.userGet(user_id, callback)](#groupusergetuser_id-callback)
- [Group.message(user_id)](#groupmessageuser_id)
- [Group.setTyping(peer_id)](#groupsettypingpeer_id)
- [Group.sendToIds(peer_ids, text, attachment)](#groupsendtoidspeer_ids-text-attachment)

### Group.onMessage(callback)
Позволяет получать все новые входящие сообщения в сообщество.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| callback | function | Да | callback функция. Возвращает объект [Message](https://github.com/AntDev95/vk-node-sdk/wiki/Message) |

##### Пример:
```javascript
Group.onMessage((message) => {
  // message.toJSON() = Объект сообщения https://vk.com/dev/objects/message
  console.log(message.toJSON())
})
```

##### Так же есть методы для получения сообщений определенных типов:

*Методы *

- **Group.onMessagePhoto(callback)** Только сообщения с фото
- **Group.onMessageText(callback)** Только сообщения с текстом
- **Group.onMessageSticker(callback)** Только сообщение со стикером
- **Group.onMessageMusic(callback)** Только сообщение с музыкой
- **Group.onMessageDoc(callback)** Только сообщение с документом
- **Group.onMessageGif(callback)** Только сообщение с анимацией
- **Group.onMessageVoice(callback)** Только голосовые сообщения
- **Group.onMessageMap(callback)** Только сообщения с картой/локацией
- **Group.onMessageVideo(callback)** Только сообщения с видео
- **Group.onMessageLink(callback)** Только сообщения c объектом ссылки
- **Group.onMessageMarket(callback)** Только сообщение с товаром
- **Group.onMessageMarketAlbum(callback)** Только сообщение c альбом товаров
- **Group.onMessageWall(callback)** Только сообщение с объектом записи на стене
- **Group.onMessageWallReply(callback)** Только сообщение с комментарием
- **Group.onMessageGift(callback)** Только сообщение с подарком
- **Group.onMessageForward(callback)** Только пересланные сообщения
- **Group.onChatTitleChange(callback)** Событие об изменении названия беседы

##### Например получать сообщения только c фото:
```javascript
Group.onMessagePhoto((message) => {
  console.log(message.getPhotos())
})
```

В каждом callback возвращаеться объект сообщения - [Message](https://github.com/AntDev95/vk-node-sdk/wiki/Message).

С помощью этого объекта можно:
- Отправить ответное сообщение
- Проверить тип сообщения
- Получить все объекты фото из сообщения

##### Простой пример:
```javascript
Group.onMessage((message) => {
  message
    .addPhoto('https://vk.com/images/gift/474/256.jpg') // Добавляем фото из URL
    .addPhoto('photo-1_456239099') // Добавление уже загруженного фото
    .addPhoto('./photos/photo.jpg') // Добавляем фото из сервера
    .addText('Test send photos') // Добавляем текст к сообщению
    .send() // Вызываем этот метод чтобы отправить сообщение
})
```

Более подробную документацию по объекту [Message](https://github.com/AntDev95/vk-node-sdk/wiki/Message) вы можете прочитать [тут](https://github.com/AntDev95/vk-node-sdk/wiki/Message)

### Group.onCommand(command, callback)
Подписывает на события сообщении с заданной командой.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| command | string или array | Да | Маска или массив масок для сообщений |
| callback | function | Да | callback функция. Возвращает объект [Message](https://github.com/AntDev95/vk-node-sdk/wiki/Message) |

##### Пример получения сообщений с текстом */start*:
```javascript
Group.onCommand('/start', (message) => {
  console.log(message.toJSON())
})
```
##### или массив комманд:
```javascript
Group.onCommand(['/start', '!start'], (message) => {
  console.log(message.toJSON())
})
```

### Group.onTypingStatusChange(callback)

Подписывает на события *Печатает*

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| callback | function | Да | callback функция. Возвращает *user_id* - id пользователя и *is_typing* - *true* = человек начал печатать и *false* если юзера закончил печатать |

##### Пример:
```javascript
Group.onTypingStatusChange((user_id, is_typing) => {
  console.log(user_id + ' - ' + (is_typing ? 'начал' : 'закончил') + ' печатать')
})
```

### Group.onCallBackEvent(event, callback)
Позволяет получать события Callback API

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| event | string или array | Да | Название или массив названий Callback API событий |
| callback | function | Да | callback функция. Возвращает объект из события |

##### Пример получение новых комментариев:
```javascript
Group.onCallBackEvent('wall_reply_new', (comment) => {
  console.log(comment)
})
```
*ВАЖНО! Включите отправку нужных вам событий в настройках [Callback API](https://vk.com/dev/callback_api) вашего сообщества*

### Group.api(method, params, callback)
Выполняет произвольный метод к VK API от имени сообщества.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| method | string | Да | Название метода |
| params | object | Да | Параметры метода |
| callback | function | Нет | callback функция. Первый аргумент возвращает результат выполнения метода или *false* если метод выполнить не удалось. Второй аргумент возвращает объект ошибки (https://vk.com/dev/errors) если метод выполнить не удалось. |

##### Пример:
```javascript
Group.api('groups.getById', {fields: 'members_count'}, (data, error) => {
  if (error) {
     console.log('Ошибка выполнения метода', error)
  } else {
     console.log(data)
     console.log('Участников в сообществе:', data[0].members_count)
  }
})
```

### Group.isMember(user_id, callback)
Проверяет подписку пользователя на текущее сообщество.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| user_id | integer | Да | id пользователя |
| callback | function | Да | callback функция. Возвращает *true* в случаи если пользователь подписан или *false* если нет |

##### Пример:
```javascript
Group.isMember(225818028, (isSubscriber) => {
  if (isSubscriber) {
     console.log('Подписан')
  } else {
     console.log('Не подписан')
  }
})
```

### Group.sendMessage(params, callback)

Отправляет сообщение от имени сообщества.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| params | object | Да | Параметры для отправки сообщения |
| callback | function | Да | callback функция. Возвращает id отправленного сообщения или *false* если сообщение отправить не удалось |

##### Пример:
```javascript
Group.sendMessage({user_id: 225818028, message: 'Привет!'}, (messageId, error) => {
  if (messageId) {
     console.log('Сообщение отправлено!\n message_id: ', messageId)
  } else {
     console.log('Не удалось отправить сообщение', error)
  }
})
```

### Group.photoUpload(peer_id, file, callback)

Загружает фотографию в диалог указанного пользователя.
После загрузки фото его можно отправить пользователю.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| peer_id | integer | Да | id диалога в который нужно загрузить фотографию |
| file | object | Да | Объект с данными для загрузки файла *(путь к файлу, имя файла, mime тип)* |
| callback | function | Да | callback функция. Возвращает объект загруженного фото или *false* если фото загрузить не удалось |

##### Пример:
```javascript
const file = {
  filename: 'photo.jpg', // Имя файла
  mimetype: 'image/jpeg', // mime тип файла
  file: './photos/photo.jpg' // Путь к файлу
}
Group.photoUpload(225818028, file, (photo) => {
  console.log(photo)
})
```

### Group.docUpload(peer_id, file, callback, type)

Загружает документ в диалог указанного пользователя.
После загрузки документа его можно отправить пользователю.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| peer_id | integer | Да | id диалога в который нужно загрузить фотографию |
| file | object | Да | Объект с данными для загрузки файла *(путь к файлу, имя файла, mime тип)* |
| callback | function | Да | callback функция. Возвращает объект загруженного документа или *false* если документ загрузить не удалось |
| type | string | Нет | Тип документа. Например: *audio_message* - для голосовых сообщений и *graffiti* - для загрузки граффити |


##### Пример:
```javascript
const file = {
  filename: 'test.gif', // Имя файла
  mimetype: 'image/gif', // mime тип файла
  file: './animations/test.gif' // Путь к файлу
}
Group.docUpload(225818028, file, (doc) => {
  console.log(doc)
})
```

### Group.coverUpload(file, callback, params)

Загружает обложку в текущее сообщество.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| file | string или object | Да | Путь или внешняя ссылка к изображению. Так же принимает объект с данными для загрузки файла *(путь к файлу, имя файла, mime тип)* |
| callback | function | Нет | callback функция. Возвращает объект загруженной обложки или *false* если обложку загрузить не удалось |
| params | object | Нет | Параметры загрузки обложки. Подробнее: https://vk.com/dev/photos.getOwnerCoverPhotoUploadServer|

##### Пример:
```javascript
Group.coverUpload('./images/cover.png')
```

### Group.messageGet(message_id, callback)

Позволяет получить сообщения по его идентификатору.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| message_id | integer | Да | Идентификатор сообщения |
| callback | function | Да | callback функция. Возвращает объект сообщения (https://vk.com/dev/objects/message) или *false* если сообщение получить не удалось |

##### Пример:
```javascript
Group.messageGet(1, (message_object) => {
  console.log(message_object)
})
```

### Group.userGet(user_id, callback)

Получает информацию о пользователе по его идентификатору.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| user_id | integer | Да | Идентификатор пользователя |
| callback | function | Да | callback функция. Возвращает объект пользователя (https://vk.com/dev/objects/user) или *false* если метод выполнить не удалось |

##### Пример:
```javascript
Group.userGet(225818028, (user) => {
  console.log('Пользователь - ', user.first_name)
})
```

### Group.message(user_id)

Создает объект сообщения.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| user_id | integer | Да | Идентификатор получателя |

##### Пример:
```javascript
Group.message(225818028).addText('Привет!').send()
```

### Group.setTyping(peer_id)

Отправляет статус "печатает".

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| peer_id | integer | Да | Идентификатор получателя |

##### Пример:
```javascript
Group.setTyping(225818028)
```

### Group.sendToIds(peer_ids, text, attachment)

Позволяет делает рассылку сообщений пользователям.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| peer_ids | array | Да | Список идентификаторов пользователей которым нужно отправить сообщение |
| text | string | Да | Текст сообщения |
| attachment | string | Нет | Прикрепление к сообщению. Например фото, видео или аудио |

##### Пример:
```javascript
Group.sendToIds([225818028, 1, 2], 'Привет!')
```

# Объект VK.App
Этот объект предназначен для работы с API для приложений.

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| access_token | string или array | Да | Ключ доступа к приложению или список ключей. |

### VK.App.Streaming()
Создает объект для работы с [Streaming API](https://vk.com/dev/streaming_api)

##### Пример:
```javascript
const VK = require('vk-node-sdk')
const App = new VK.App('APP_TOKEN')
const Streaming = App.Streaming()

// Получение новых событий
Streaming.onListener((event) => {
  console.log('new event', event)
})

// Добавление правил
Streaming.addRule('vk', 2).addRule('bot', 'bot_tag')

// Получение текущих правил
Streaming.getRules((rules) => {
  console.log(rules)
})

// Удалить все правила
Streaming.clearRules()

// Удалить одно правило
Streaming.deleteRule(2)
```

# Контакты
Сообщество ВКонтакте: [vk.com/nodesdk](https://vk.com/nodesdk)