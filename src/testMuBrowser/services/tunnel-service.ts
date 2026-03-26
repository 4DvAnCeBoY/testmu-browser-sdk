
import { Tunnel } from '@lambdatest/node-tunnel';

interface TunnelConfig {
    user: string;
    key: string;
    tunnelName?: string;
    proxyHost?: string;
    proxyPort?: string;
    proxyUser?: string;
    proxyPass?: string;
    pidfile?: string;
    logFile?: string;
}

export class TunnelService {
    private tunnelInstance: Tunnel | null = null;

    async start(config: TunnelConfig): Promise<void> {
        if (this.getStatus()) {
            console.log('Tunnel is already running.');
            return;
        }

        console.log('Starting LambdaTest Tunnel...');
        this.tunnelInstance = new Tunnel();

        // Convert config to Tunnel Arguments
        // https://www.lambdatest.com/support/docs/tunnel-modifiers/
        const tunnelArgs: any = {
            user: config.user,
            key: config.key,
            tunnelName: config.tunnelName || `testMuBrowser_Tunnel_${Date.now()}`,
            v: true, // Verbose logging
        };

        if (config.proxyHost) {
            tunnelArgs.proxyHost = config.proxyHost;
            tunnelArgs.proxyPort = config.proxyPort;
            if (config.proxyUser) {
                tunnelArgs.proxyUser = config.proxyUser;
                tunnelArgs.proxyPass = config.proxyPass;
            }
        }

        // Log file for debugging
        if (config.logFile) {
            tunnelArgs.logFile = config.logFile;
        }

        return new Promise((resolve, reject) => {
            this.tunnelInstance?.start(tunnelArgs, (error: Error | undefined) => {
                if (error) {
                    console.error('Failed to start tunnel:', error);
                    reject(error);
                } else {
                    console.log('Tunnel Started Successfully!');
                    resolve();
                }
            });
        });
    }

    async stop(): Promise<void> {
        if (!this.tunnelInstance || !this.getStatus()) {
            return;
        }

        console.log('Stopping LambdaTest Tunnel...');
        return new Promise((resolve) => {
            this.tunnelInstance?.stop(() => {
                console.log('Tunnel Stopped.');
                this.tunnelInstance = null;
                resolve();
            });
        });
    }

    getStatus(): boolean {
        if (!this.tunnelInstance) return false;
        return this.tunnelInstance.isRunning();
    }
}
