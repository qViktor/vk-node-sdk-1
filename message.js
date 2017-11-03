const path = require('path')
const Utils = require('./utils')

class Message {
    constructor(vk, json) {
        this.vk = vk
        this.id = json.id
        this.date = json.date
        this.out = json.out
        this.user_id = json.user_id
        this.read_state = json.read_state
        this.title = json.title
        this.body = json.body
        this.geo = json.geo || false
        this.attachments = json.attachments || false
        this.fwd_messages = json.fwd_messages || false
        this.emoji = json.emoji || false
        this.reply = {peer_id: this.user_id, attachment: [], forward_messages: []}
        this.uploadDocs = []
        this.uploadPhotos = []
    }

    toJSON() {
        let json = {
            id: this.id,
            date: this.date,
            out: this.out,
            user_id: this.user_id,
            read_state: this.read_state,
            title: this.title,
            body: this.body
        }
        if (this.fwd_messages) json.fwd_messages = this.fwd_messages
        if (this.attachments) json.attachments = this.attachments
        if (this.geo) json.geo = this.geo
        if (this.emoji) json.emoji = 1
        return json
    }

    toString() {
        return JSON.stringify(toJSON())
    }

    isPhotoMessage() {
    	return this.attachments && this.attachments[0].type == 'photo'
    }

    getPhotos() {
        if (!this.isPhotoMessage()) return []
        let photos = []
        for (var i = this.attachments.length - 1; i >= 0; i--) {
            if (this.attachments[i].photo) photos.push(this.attachments[i].photo)
        }
        return photos
    }

    getAudioMessages() {
        if (!this.isAudioMessage()) return []
        let audio_messages = []
        for (var i = this.attachments.length - 1; i >= 0; i--) {
            let attachment = this.attachments[i]
            if (attachment.type != 'doc') break
            if (attachment.doc && attachment.doc.preview && attachment.doc.preview.audio_msg) {
                audio_messages.push(attachment.doc)
            }
        }
        return audio_messages
    }

    isMusicMessage() {
        return this.attachments && this.attachments[0].type == 'audio'
    }

    isStickerMessage() {
        return this.attachments && this.attachments[0].type == 'sticker'
    }

    isAudioMessage() {
    	return this.attachments && this.attachments[0].type == 'doc' && this.attachments[0].doc.preview && this.attachments[0].doc.preview.audio_msg
    }

    isGifMessage() {
    	return this.attachments && this.attachments[0].type == 'doc' && this.attachments[0].doc.ext == 'gif'
    }

    isDocMessage() {
    	return this.attachments && this.attachments[0].type == 'doc' && !this.isAudioMessage() && !this.isGifMessage()
    }

    isTextMessage() {
        return this.body && !this.attachments && !this.fwd_messages && !this.geo
    }

    addText(text) {
        this.reply.message = text
        return this
    }

    sendSticker(sticker_id, callback) {
        this.reply.sticker_id = sticker_id
        this.send(callback)
    }

    addForward(data) {
        if (typeof data === 'object') {
            for (var i = data.length - 1; i >= 0; i--) {
                this.addForward(data[i])
            }
        } else {
            data = parseInt(data)
            if (data == NaN || 0 >= data) return this
            try {
                this.reply.forward_messages.push(data)
            } catch(e) {
                this.reply.forward_messages = []
                this.addForward(data)
            }
        }
        return this
    }

    addPhoto(file) {
        let self = this
        if (typeof file === 'string') {
            if (file.match(/photo(-?)[0-9]+_[0-9]+?$/g)) {
                self.addAttachment(file)
            } else if (file.startsWith('http:') || file.startsWith('https:')) {
                file = {
                    url: file
                }
                self.uploadPhotos.push(file)
            } else {
                let ext = path.extname(file)
                file = {
                    file: file, 
                    filename: path.basename(file)
                }
                switch(ext) {
                    case '.gif':
                    case '.jpg':
                    case '.jpeg':
                    case '.png':
                        file.mimetype = 'image' + ext.replace(/\./g, /\//g)
                        break
                }
                self.uploadPhotos.push(file)
            }
        } else if ((file.filename && file.mimetype && (file.buffer || file.file)) || file.url) {
            self.uploadPhotos.push(file)
        }
        return this
    }
    
    addAttachment(attachment) {
        if (!this.reply.attachment) {
            this.reply.attachment = []
        }
        if (typeof this.reply.attachment == 'string') {
            this.reply.attachment = this.reply.attachment.split(',')
        }
        this.reply.attachment.push(attachment)
        return this
    }

    addDoc(file, type) {
        let self = this
        if (typeof file === 'string') {
            if (file.match(/doc(-?)[0-9]+_[0-9]+?$/g)) {
                self.addAttachment(file)
            } else if (file.startsWith('http:') || file.startsWith('https:')) {
                file = {
                    url: file
                }
                if (type) file.type = type
                self.uploadDocs.push(file)
            } else {
                let ext = path.extname(file)
                file = {
                    file: file, 
                    filename: path.basename(file)
                }
                switch(ext) {
                    case '.mp3':
                    case '.wav':
                        file.mimetype = 'audio/mpeg'
                        break
                    case '.gif':
                    case '.jpg':
                    case '.jpeg':
                    case '.png':
                        file.mimetype = 'image' + ext.replace(/\./g, /\//g)
                        break
                }
                if (type) file.type = type
                self.uploadDocs.push(file)
            }
        } else if (file.filename && file.mimetype && (file.buffer || file.file)) {
            if (type) file.type = type
            self.uploadDocs.push(file)
        }
        return self
    }

    send(callback) {
        let self = this
        callback = callback || Function()
        if (self.uploadDocs.length) {
            let file = self.uploadDocs.shift()
            if (file.url) {
                Utils.getBuffer(file.url, (file.params || {}), (buffer, response) => {
                    if (buffer) {
                        file.buffer = buffer
                        file.mimetype = response.headers['content-type']
                        file.filename = 'file.' + file.mimetype.split(/\//)[1]
                        delete file.url
                        self.uploadDocs.push(file)
                        self.send(callback)
                    } else {
                        self.send(callback)
                    }
                })
                return
            }
            self.vk.docUpload(self.user_id, file, (doc) => {
                if (doc) self.reply.attachment.push('doc' + doc.owner_id + '_' + doc.id)
                self.send(callback)
            }, file.type)
            return
        }
        if (self.uploadPhotos.length) {
            let file = self.uploadPhotos.shift()
            if (file.url) {
                Utils.getBuffer(file.url, (file.params || {}), (buffer, response) => {
                    if (buffer) {
                        file.buffer = buffer
                        file.mimetype = response.headers['content-type']
                        file.filename = 'file.' + file.mimetype.split(/\//)[1]
                        delete file.url
                        self.uploadPhotos.push(file)
                        self.send(callback)
                    } else {
                        self.send(callback)
                    }
                })
                return
            }
            self.vk.photoUpload(self.user_id, file, (photo) => {
                if (photo) self.reply.attachment.push('photo' + photo.owner_id + '_' + photo.id)
                self.send(callback)
            })
            return
        }
        try {
            if (self.reply.attachment && self.reply.attachment.length) self.reply.attachment = self.reply.attachment.join(',')
        } catch(ignored) { } 
        try {
            if (self.reply.forward_messages && self.reply.forward_messages.length) self.reply.forward_messages = self.reply.forward_messages.join(',')
        } catch(ignored) { }
        if (self.reply.peer_id) {
            self.vk.sendMessage(self.reply, callback)
        } else {
            callback(false)
        }
        self.reply = {peer_id: self.user_id, attachment: [], forward_messages: []}
    }
}

module.exports = Message;
