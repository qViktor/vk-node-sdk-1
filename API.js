'use strict'

const Utils = require('./utils')
const API_URL = 'https://api.vk.com/method/'
const API_VERSION = '5.67'

class API {
  constructor(tokens) {
    let self = this
    self.CallbackRegistry = {}
    self.MethodQueue = []
    self.AccessTokens = tokens
    self.LastToken = 0
    setInterval(() => self.execute(), Math.ceil(1000 / (self.AccessTokens.length * 3)) + 50)
  }

  execute() {
    let self = this
    let methods = self.MethodQueue.slice(0, 25)
    self.MethodQueue = self.MethodQueue.slice(25)
    if (!methods.length) return
    let code = 'return [' + methods.join(',') + '];'
    self.api('execute', {code: code}, (data, error) => {
      if (!data || !data.response) return
      let execute_errors = data.execute_errors || []
      for (var i = data.response.length - 1; i >= 0; i--) {
        let item = data.response[i]
        if (self.CallbackRegistry[item.callback]) {
          try {
            self.CallbackRegistry[item.callback](item.response, !item.response ? execute_errors.shift() : false)
          } catch(e) {
            self.CallbackRegistry[item.callback](item.response, {error: {error_code: -1, error_msg: 'Execution failed'}})
          }
        }
      }
    })
  }

  api(method, params, callback, attempt) {
    let self = this
    method = method || 'execute'
    params = params || {}
    callback = callback || Function()
    attempt = attempt || 0
    attempt++
    if (attempt > 5) return callback(false, {error: {error_code: -1, error_msg: 'Execution failed'}})
    if (!(method == 'execute' || method == 'photos.getOwnerCoverPhotoUploadServer' || method == 'photos.saveOwnerCoverPhoto')) {
      let callbackName = 'request' + Utils.time() + '_' + Utils.rand() + '_' + Utils.rand()
      let timerId = setTimeout(() => { 
        delete self.CallbackRegistry[callbackName]
        callback(false, {error: {error_code: -1, error_msg: 'Execution failed'}})
      }, 3000)
      self.CallbackRegistry[callbackName] = (data, error) => {
        if (error) {
          error.request_params = []
          Object.keys(params).forEach((key) => error.request_params.push({key: key, value: params[key]}))
        }
        callback(data, error)
        clearTimeout(timerId)
        delete self.CallbackRegistry[callbackName]
      }
      self.MethodQueue.push('{"callback": "' + callbackName + '", "response": API.' + method + '(' + JSON.stringify(params) + ')}')
    } else {
      if (!params.v) params.v = API_VERSION
      params.access_token = self.AccessTokens[self.LastToken]
      self.LastToken++
      if (self.LastToken >= self.AccessTokens.length) self.LastToken = 0
      Utils.post(API_URL + method, params, (body, response) => {
        if (!body && !response) return setTimeout(() => self.api(method, params, callback, attempt), 400)
        if (!response.headers['content-type'].startsWith('application/json')) return setTimeout(() => self.api(method, params, callback, attempt), 400)
        body = JSON.parse(body)
        if (body.response) return callback(body)
        if (!body.error) return setTimeout(() => self.api(method, params, callback, attempt), 400)
        switch (body.error.error_code) {
          case 10:
          case 9:
          case 6:
          case 1:
            return setTimeout(() => self.api(method, params, callback, attempt), 400)
          default:
            callback(false, body)
        }
      })
    }
  }
}

module.exports = API
