const Fly = require("../libs/flyio/wx.umd.min.js");

const fpmc = require('./fpmc.js');

fpmc.init({ endpoint: 'https://api.yunplus.io/api', masterKey: '123123', appkey: '123123'});
// fpmc.ping().then(console.log);

const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

module.exports = {
  formatTime: formatTime,
  fpmc
}
