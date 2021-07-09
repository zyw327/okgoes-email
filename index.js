const net = require('net');

class SMTPConnection {
    constructor(options) {
        this._socket = false;
        this._options = options;
        this._remainder = '';
        this._data = '';
        this._fromUser = '';
        this._toUser = '';
        this._subject = '';
        this._content = '';
        this._status = [];
    }

    /**
     * 建立连接
     */
    _onConnect() {
        this._socket = net.createConnection({ port: this._options.port || 25, host: this._options.host }, async () => {
            this._socket.setKeepAlive(true);
        });
        this._socket.on("data", (chunk) => {
            this._onData(chunk);
        });
        this._socket.on("end", this._onEnd);
    }

    /**
     * 指令发送
     * @param {*} cmd 邮件指令
     * @returns 
     */
    _sendCommand(cmd) {
        if (!this._socket) {
            return ;
        }
        return new Promise((resolve, reject) => {
            this._socket.write(Buffer.from(cmd, 'utf-8'), (err) => {
                if (err) {
                    console.log(err);
                    return reject(err);
                }
                resolve(true);
            });
        });
    }

    /**
     * 结束
     */
    _onEnd() {
        this._socket = false;
    }

    /**
     * 数据处理
     * @param {*} chunk 接收到的内容
     * @returns 
     */
    async _onData(chunk) {
        if (!chunk || !chunk.length) {
            return ;
        }
        this._data += chunk.toString();
        let lines = this._data.split(/\r?\n/);
        this._parseStatus();
        if (!lines || !lines.length) {
            return ;
        }
        this._remainder = lines.pop();
        if (!this._remainder) {
            this._remainder = lines.pop();
        }
        if (this._status && this._status[0] && this._status[0].status == 220 && !this._status[0].is_exec) {
            await this._sendCommand(`HELO ${this._options.host}\r\n`);
            this._status[0].is_exec = true;
        }
        
        if (this._status && this._status[1] && this._status[1].status == 250 && !this._status[1].is_exec) {
            await this._sendCommand("AUTH LOGIN\r\n");
            this._status[1].is_exec = true;
        }

        if (this._status && this._status[2] && this._status[2].status == 334 && !this._status[2].is_exec) {
            await this._sendCommand(Buffer.from(this._options.auth.username, 'utf-8').toString('base64') + "\r\n");
            this._status[2].is_exec = true;
        }

        if (this._status && this._status[3] && this._status[3].status == 334 && !this._status[3].is_exec) {
            await this._sendCommand(Buffer.from(this._options.auth.password, 'utf-8').toString('base64') + "\r\n");
            this._status[3].is_exec = true;
        }

        if (this._status && this._status[4] && this._status[4].status == 235 && !this._status[4].is_exec) {
            await this._sendCommand(`MAIL FROM:<${this._options.auth.username}>\r\n`);
            this._status[4].is_exec = true;
        }

        if (this._status && this._status[5] && this._status[5].status == 250 && !this._status[5].is_exec) {
            await this._sendCommand(`RCPT TO:<${this._toUser}>\r\n`);
            this._status[5].is_exec = true;
        }

        if (this._status && this._status[6] && this._status[6].status == 250 && !this._status[6].is_exec) {
            await this._sendCommand("DATA\r\n");
            this._status[6].is_exec = true;
        }

        if (this._status && this._status[7] && this._status[7].status == 354 && !this._status[7].is_exec) {
            await this._sendCommand(this._sendData(this._fromUser, this._toUser, this._subject, this._content));
            this._status[7].is_exec = true;
        }

        if (this._status && this._status[8] && this._status[8].status == 250 && !this._status[8].is_exec) {
            await this._sendCommand("QUIT\r\n");
            this._status[8].is_exec = true;
        }

        if (this._status && this._status[9] && this._status[9].status == 221 && !this._status[9].is_exec) {
            this._status[9].is_exec = true;
            this._socket.end();
        }

        if (this._remainder && /(500|503|502|501|526)/g.test(this._remainder)) {
            this._socket.end();
        }
    }

    /**
     * 状态解析
     */
    async _parseStatus() {
        let lines = this._data.split(/\r?\n/);
        for (let key in lines) {
            let line = lines[key];
            if (!line) {
                continue;
            }
            let msg = line.length > 3 ? line.substr(3, line.length) : '';
            if (line.substr(0, 3) == '334') {
                msg = Buffer.from(msg, "base64").toString();
            }
            this._status[key] = {
                line,
                is_exec: ((this._status.length && this._status[key] && this._status[key].is_exec) ? true : false),
                status: line.substr(0, 3),
                msg
            }
        }
        console.log(this._status);
    }

    /**
     * 生成发送的内容
     * @param {*} fromUser 发送者邮箱
     * @param {*} toUser 接收者邮箱
     * @param {*} subject 发送的主题
     * @param {*} body 正文内容
     * @returns 
     */
    _sendData(fromUser, toUser, subject, body) {
        let message = `From:${fromUser}\r\nTo:${toUser}\r\nSubject:${subject}\r\nMIME-Version: 1.0\r\n`;
        message += `Content-Type: multipart/mixed;boundary=@boundary@\r\n\r\n`;
        message += "--@boundary@\r\nContent-Type: text/plain;charset=\"utf-8\"\r\n\r\n" + body + "\r\n\r\n";
        message += "--@boundary@--\r\n.\r\n";
        return message;
    }

    /**
     * 
     * @param {*} fromUser 发送者邮箱
     * @param {*} toUser 接收者邮箱
     * @param {*} subject 发送的主题
     * @param {*} content 正文内容
     */
    async send(fromUser, toUser, subject, content) {
        this._fromUser = fromUser;
        this._toUser = toUser;
        this._subject = subject;
        this._content = content;
        this._onConnect();
    }
}

module.exports = SMTPConnection;