const axios = require('axios')
const api = axios.create({baseURL: 'http://digischools.nest/api/v1/', timeout: 10000})
const qs = require('qs')

// POST wrapper
api.p = (url, data) => {
    return new Promise((resolve, reject) => {
        api
            .post(url, qs.stringify(data))
            .then(d => resolve(d))
            .catch(e => reject(e))
    })
}

// GET wrapper
api.g = (url, data) => {
    return new Promise((resolve, reject) => {
        api
            .get(url, {params: data})
            .then(d => resolve(d))
            .catch(e => reject(e))
    })
}
module.exports = api