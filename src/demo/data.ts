export type Role = "admin" | "technician";
export type Page = "workspace" | "customers" | "connectors" | "members" | "audit" | "security";
export type Protocol = "SSH" | "RDP" | "Telnet";
export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  customerIds: string[];
}
export interface Customer {
  id: string;
  name: string;
  code: string;
  description: string;
  network: string;
  zone: string;
}
export interface Connector {
  id: string;
  customerId: string;
  name: string;
  vpn: string;
  online: boolean;
  route: string;
}
export interface Resource {
  id: string;
  customerId: string;
  name: string;
  host: string;
  port: number;
  protocol: Protocol;
  environment: "Production" | "Staging";
  account: string;
  credentialLabel: string;
}
export interface AuditEvent {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  result: "success" | "denied" | "notice";
}
export interface DemoTab {
  id: string;
  resourceId: string;
  status: "open" | "closed";
  reason?: string;
  lines: string[];
}

// Fictional companies and RFC 5737 documentation addresses. Never use customer data here.
export const CUSTOMERS: Customer[] = [
  { id: "atlas", name: "Atlas Lab", code: "ATL", description: "Hạ tầng ứng dụng và cơ sở dữ liệu", network: "192.0.2.0/24", zone: "Vùng mạng A" },
  { id: "harbor", name: "Harbor Lab", code: "HBR", description: "Hệ thống văn phòng và Windows", network: "198.51.100.0/24", zone: "Vùng mạng B" },
  { id: "cedar", name: "Cedar Lab", code: "CDR", description: "Thiết bị mạng và môi trường thử nghiệm", network: "203.0.113.0/24", zone: "Vùng mạng C" },
];
export function initialUsers(): DemoUser[] {
  return [
    { id: "admin", name: "Admin Demo", email: "admin@example.invalid", role: "admin", active: true, customerIds: ["atlas", "harbor", "cedar"] },
    { id: "linh", name: "Linh Demo", email: "linh@example.invalid", role: "technician", active: true, customerIds: ["atlas"] },
    { id: "minh", name: "Minh Demo", email: "minh@example.invalid", role: "technician", active: true, customerIds: ["harbor", "cedar"] },
  ];
}
export function initialConnectors(): Connector[] {
  return [
    { id: "edge-atlas", customerId: "atlas", name: "connector-atlas-01", vpn: "WireGuard", online: true, route: "192.0.2.0/24" },
    { id: "edge-harbor", customerId: "harbor", name: "connector-harbor-01", vpn: "IPsec", online: true, route: "198.51.100.0/24" },
    { id: "edge-cedar", customerId: "cedar", name: "connector-cedar-01", vpn: "OpenVPN", online: false, route: "203.0.113.0/24" },
  ];
}
export function initialResources(): Resource[] {
  return [
    { id: "atlas-web", customerId: "atlas", name: "web-app-01", host: "192.0.2.10", port: 22, protocol: "SSH", environment: "Production", account: "ops-demo", credentialLabel: "SSH certificate · demo" },
    { id: "atlas-db", customerId: "atlas", name: "database-01", host: "192.0.2.20", port: 22, protocol: "SSH", environment: "Production", account: "dbops-demo", credentialLabel: "Managed SSH key · demo" },
    { id: "atlas-stage", customerId: "atlas", name: "staging-01", host: "192.0.2.30", port: 22, protocol: "SSH", environment: "Staging", account: "developer-demo", credentialLabel: "Managed SSH key · demo" },
    { id: "harbor-win", customerId: "harbor", name: "windows-admin-01", host: "198.51.100.10", port: 3389, protocol: "RDP", environment: "Production", account: "LAB\\operator", credentialLabel: "Managed account · demo" },
    { id: "harbor-backup", customerId: "harbor", name: "backup-01", host: "198.51.100.20", port: 22, protocol: "SSH", environment: "Staging", account: "backup-demo", credentialLabel: "Managed SSH key · demo" },
    { id: "cedar-switch", customerId: "cedar", name: "legacy-switch-01", host: "203.0.113.10", port: 23, protocol: "Telnet", environment: "Staging", account: "operator-demo", credentialLabel: "Legacy account · demo" },
  ];
}
export const customerName = (id: string) => CUSTOMERS.find(customer => customer.id === id)?.name || id;
export const demoId = () => crypto.randomUUID();
export function simulateCommand(command: string, resource: Resource): string[] {
  const clean = command.trim();
  if (!clean) return [];
  const commands: Record<string, string[]> = {
    help: ["Lệnh mô phỏng: help, whoami, hostname, pwd, ls, uptime, df -h, date, clear, exit.", "Không có lệnh nào được gửi đến máy chủ. Không nhập mật khẩu hoặc dữ liệu thật."],
    whoami: [resource.account], hostname: [resource.name], pwd: ["/home/ops-demo"],
    ls: ["deployments/  logs/  README.demo.txt"],
    uptime: ["[MẪU] up 12 days, 4:32, 1 user, load average: 0.12, 0.09, 0.04"],
    "df -h": ["[MẪU] Filesystem   Size  Used  Avail  Use%  Mounted on", "/dev/demo     80G   24G    56G   30%  /"],
    date: [new Date().toLocaleString("vi-VN")],
  };
  return commands[clean] || ["Không thực thi. Đây là terminal mô phỏng; gõ help để xem lệnh mẫu."];
}
