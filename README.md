# tcp/ip发送邮件
### smtp协议
> SMTP是一种提供可靠且有效的电子邮件传输的协议。SMTP是建立在FTP文件传输服务上的一种邮件服务，主要用于系统之间的邮件信息传递，并提供有关来信的通知。SMTP独立于特定的传输子系统，且只需要可靠有序的数据流信道支持，SMTP的重要特性之一是其能跨越网络传输邮件，即“SMTP邮件中继”。使用SMTP，可实现相同网络处理进程之间的邮件传输，也可通过中继器或网关实现某处理进程与其他网络之间的邮件传输。
### 建立连接
```js
const net = require("net");
const client = net.createConnection({
    port: 25,
    host: smtp_server_host
}, () => {

});
```

### 建立通信
```js
client.write(Buffer.from("HELO smtp_server_host\r\n", 'utf-8'), (err) => {
    if (err) {
        console.log(err);
    }
});
```

### 账号认证
```js
client.write(Buffer.from("AUTH LOGIN\r\n", 'utf-8'), (err) => {
    if (err) {
        console.log(err);
    }
});
client.write(Buffer.from("email_account", 'utf-8').toString('base64') + "\r\n", (err) => {
    if (err) {
        console.log(err);
    }
});
client.write(Buffer.from("email_password", 'utf-8').toString("base64") + "\r\n", (err) => {
    if (err) {
        console.log(err);
    }
});
```
### 设置发送人及接收人
``` js
// 设置发送人
client.write(Buffer.from("MAIL FROM:<email_account>\r\n", "utf-8"), (err) => {
    if (err) {
        console.log(err);
    }
});
// 设置接收人
client.write(Buffer.from("RCPT TO:<to_email_account>\r\n", "utf-8"), (err) => {
    if (err) {
        console.log(err);
    }
});
```
### 发送邮件正文

```js
// 告诉服务器准备发送正文数据
client.write(Buffer.from("DATA\r\n", "utf-8"), (err) => {
    if (err) {
        console.log(err);
    }
});
// 邮件接收人
let sendData = `From:email_account\r\n`;
// 接收人
sendData += `To:to_email_account\r\n`;
// 邮件主题
sendData += `Subject:email_subject\r\n`;
// 指定正文类型，富文本可用 Content-Type: text/html
sendData += "Content-Type: text/plain;\r\n";
sendData += `email_content\r\n.\r\n`;
client.write(Buffer.from(sendData, "utf-8"), (err) => {
    if (err) {
        console.log(err);
    }
});
```
### 结束邮件发送
```js
client.write(Buffer.from("QUIT\r\n", "utf-8"), (err) => {
    if (err) {
        console.log(err);
    }
});
client.end();

> 文中smtp_server_host为邮件服务器地址的host，email_account需要替换为真实的邮件地址，to_email_account为接收人的邮件地址，email_subject为邮件主题，email_content为邮件正文内容

