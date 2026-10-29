import { WebSocketServer } from 'ws';
import { Client as SshClient } from 'ssh2';

export function setupSshGateway(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/ssh' });

  wss.on('connection', (ws) => {
    let sshClient = null;
    let sshStream = null;
    let sftpSession = null;

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());

        if (msg.type === 'connect') {
          const { host, port = 22, username, password, privateKey } = msg.payload || {};
          if (!host || !username) {
            ws.send(JSON.stringify({ type: 'error', message: 'Missing host or username' }));
            return;
          }

          sshClient = new SshClient();

          sshClient.on('ready', () => {
            ws.send(JSON.stringify({ type: 'connected', host, username }));

            // Start PTY shell session
            sshClient.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, stream) => {
              if (err) {
                ws.send(JSON.stringify({ type: 'error', message: `Shell error: ${err.message}` }));
                return;
              }
              sshStream = stream;

              stream.on('data', (data) => {
                ws.send(JSON.stringify({ type: 'terminal_output', data: data.toString('utf-8') }));
              });

              stream.on('close', () => {
                ws.send(JSON.stringify({ type: 'terminal_close' }));
                if (sshClient) sshClient.end();
              });
            });

            // Init SFTP subsystem
            sshClient.sftp((err, sftp) => {
              if (!err) {
                sftpSession = sftp;
                ws.send(JSON.stringify({ type: 'sftp_ready' }));
              }
            });
          });

          sshClient.on('error', (err) => {
            ws.send(JSON.stringify({ type: 'error', message: `SSH error: ${err.message}` }));
          });

          sshClient.on('close', () => {
            ws.send(JSON.stringify({ type: 'disconnected' }));
          });

          const connConfig = {
            host,
            port: Number(port) || 22,
            username,
            readyTimeout: 20000,
          };
          if (password) connConfig.password = password;
          if (privateKey) connConfig.privateKey = privateKey;

          sshClient.connect(connConfig);
        } else if (msg.type === 'terminal_input') {
          if (sshStream && sshStream.writable) {
            sshStream.write(msg.data);
          }
        } else if (msg.type === 'terminal_resize') {
          const { cols, rows } = msg.payload || {};
          if (sshStream && sshStream.setWindow && cols && rows) {
            sshStream.setWindow(rows, cols, 0, 0);
          }
        } else if (msg.type === 'sftp_list') {
          const { path = '.' } = msg.payload || {};
          if (!sftpSession) {
            ws.send(JSON.stringify({ type: 'sftp_error', id: msg.id, message: 'SFTP not ready' }));
            return;
          }
          sftpSession.readdir(path, (err, list) => {
            if (err) {
              ws.send(JSON.stringify({ type: 'sftp_error', id: msg.id, message: err.message }));
            } else {
              const files = list.map((item) => ({
                name: item.filename,
                size: item.attrs.size,
                isDirectory: (item.attrs.mode & 0o40000) === 0o40000,
                mtime: item.attrs.mtime * 1000,
              }));
              ws.send(JSON.stringify({ type: 'sftp_list_res', id: msg.id, path, files }));
            }
          });
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', () => {
      if (sshClient) {
        try {
          sshClient.end();
        } catch (_) {}
      }
    });
  });

  return wss;
}
