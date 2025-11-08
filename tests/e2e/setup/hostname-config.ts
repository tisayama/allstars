/**
 * HostnameConfig - Verify and manage hostname configuration
 * Feature: 001-system-e2e-tests
 *
 * Ensures work-ubuntu hostname is configured and apps use it
 * Per constitution: MUST use work-ubuntu, NEVER localhost
 */

import { readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface HostnameConfig {
  /** Required hostname for all apps (default: work-ubuntu) */
  hostname: string;

  /** Expected IP address (default: 127.0.0.1 or 127.0.1.1) */
  expectedIp?: string;
}

const DEFAULT_CONFIG: HostnameConfig = {
  hostname: 'work-ubuntu',
  expectedIp: '127.0.1.1',
};

export class HostnameConfigManager {
  private config: HostnameConfig;

  constructor(config: Partial<HostnameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Verify hostname is configured in /etc/hosts
   * @returns true if hostname resolves correctly, false otherwise
   */
  async verifyHostname(): Promise<boolean> {
    try {
      // Read /etc/hosts
      const hostsContent = await readFile('/etc/hosts', 'utf-8');

      // Check if hostname is configured
      const hostnameRegex = new RegExp(`^${this.config.expectedIp}\\s+${this.config.hostname}`, 'm');
      const hasHostname = hostnameRegex.test(hostsContent);

      if (!hasHostname) {
        console.error(`Hostname ${this.config.hostname} not found in /etc/hosts`);
        return false;
      }

      // Verify hostname resolves via ping
      const canPing = await this.canPingHostname();

      if (!canPing) {
        console.error(`Hostname ${this.config.hostname} does not resolve correctly`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error verifying hostname: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get app URL for specified port using work-ubuntu hostname
   * @param port - Application port number
   * @param path - Optional path (e.g., "/health")
   * @returns Full URL using work-ubuntu hostname
   */
  getAppUrl(port: number, path: string = ''): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `http://${this.config.hostname}:${port}${cleanPath}`;
  }

  /**
   * Get all app URLs for standard AllStars ports
   * @returns Map of app names to URLs
   */
  getAllAppUrls(): Record<string, string> {
    return {
      'admin-app': this.getAppUrl(5174),
      'host-app': this.getAppUrl(5175),
      'participant-app': this.getAppUrl(5173),
      'projector-app': this.getAppUrl(5176),
      'api-server': this.getAppUrl(3000),
      'socket-server': this.getAppUrl(3001),
    };
  }

  /**
   * Verify hostname can be pinged
   * @returns true if ping succeeds, false otherwise
   */
  private async canPingHostname(): Promise<boolean> {
    try {
      // Use timeout to prevent hanging
      const { stdout } = await execAsync(`timeout 2 ping -c 1 ${this.config.hostname}`, {
        timeout: 3000,
      });

      return stdout.includes('1 received');
    } catch (error) {
      return false;
    }
  }

  /**
   * Suggest fix for missing hostname configuration
   * @returns Command to add hostname to /etc/hosts
   */
  getSuggestedFix(): string {
    return `echo "${this.config.expectedIp} ${this.config.hostname}" | sudo tee -a /etc/hosts`;
  }

  /**
   * Get current hostname configuration
   * @returns Current hostname config object
   */
  getConfig(): HostnameConfig {
    return { ...this.config };
  }
}
