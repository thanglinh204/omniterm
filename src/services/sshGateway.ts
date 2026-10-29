// OmniTerm Real SSH & SFTP WebSocket Gateway Client

export interface SshGatewayConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface SftpRemoteFile {
  name: string;
  size: number;
  isDirectory: boolean;
  mtime: number;
}

export class SshGatewayClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onDataCallback: ((data: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;
  private pendingSftpRequests: Map<string, (files: SftpRemoteFile[]) => void> = new Map();

  constructor(url?: string) {
    if (url) {
      this.url = url;
    } else {
      const loc = window.location;
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      this.url = `${proto}//${loc.host}/ws/ssh`;
    }
  }

  public connect(config: SshGatewayConfig, onData: (data: string) => void, onStatus?: (status: string) => void) {
    this.onDataCallback = onData;
    this.onStatusCallback = onStatus || null;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        if (this.onStatusCallback) this.onStatusCallback('connecting');
        this.send({
          type: 'connect',
          payload: config,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'terminal_output' && this.onDataCallback) {
            this.onDataCallback(msg.data);
          } else if (msg.type === 'connected') {
            if (this.onStatusCallback) this.onStatusCallback('connected');
          } else if (msg.type === 'disconnected') {
            if (this.onStatusCallback) this.onStatusCallback('disconnected');
          } else if (msg.type === 'sftp_list_res') {
            const cb = this.pendingSftpRequests.get(msg.id);
            if (cb) {
              cb(msg.files || []);
              this.pendingSftpRequests.delete(msg.id);
            }
          }
        } catch (_) {
          if (this.onDataCallback) this.onDataCallback(event.data);
        }
      };

      this.ws.onerror = (err) => {
        if (this.onStatusCallback) this.onStatusCallback('error');
      };

      this.ws.onclose = () => {
        if (this.onStatusCallback) this.onStatusCallback('disconnected');
      };
    } catch (e) {
      if (this.onStatusCallback) this.onStatusCallback('error');
    }
  }

  public sendInput(data: string) {
    this.send({ type: 'terminal_input', data });
  }

  public resize(cols: number, rows: number) {
    this.send({ type: 'terminal_resize', payload: { cols, rows } });
  }

  public listFiles(path: string): Promise<SftpRemoteFile[]> {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(7);
      this.pendingSftpRequests.set(id, resolve);
      this.send({ type: 'sftp_list', id, payload: { path } });
      setTimeout(() => {
        if (this.pendingSftpRequests.has(id)) {
          this.pendingSftpRequests.delete(id);
          resolve([]);
        }
      }, 5000);
    });
  }

  public disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
  }

  private send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
