const axios = require('axios')
module.exports = axios.create({
    baseURL: 'http://192.168.8.120/digischools-superadmin/api/v1/'
})