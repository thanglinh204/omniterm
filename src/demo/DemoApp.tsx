import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Terminal, ShieldCheck, Network, Users, ScrollText, LockKeyhole,
  Search, Plus, ArrowUpRight, ChevronRight, X, LogOut, Server,
  Building2, Cable, Check, CircleHelp, Folder, FileText, Monitor,
  RotateCcw, ShieldAlert, Eye, Settings2, Unplug, Play, Menu,
} from "lucide-react";
import {
  CUSTOMERS, initialUsers, initialConnectors, initialResources, customerName,
  demoId, simulateCommand, DemoUser, Page, Resource, AuditEvent, DemoTab,
} from "./data";
import "./demo.css";

const NAV: { id: Page; label: string; icon: typeof Terminal; admin?: boolean }[] = [
  { id: "workspace", label: "Không gian vận hành", icon: Terminal },
  { id: "customers", label: "Khách hàng", icon: Building2 },
  { id: "connectors", label: "Connector & VPN", icon: Network },
  { id: "members", label: "Thành viên & quyền", icon: Users, admin: true },
  { id: "audit", label: "Nhật ký truy cập", icon: ScrollText, admin: true },
  { id: "security", label: "Bảo mật", icon: ShieldCheck },
];
const PAGE_COPY: Record<Page, { title: string; description: string }> = {
  workspace: { title: "Không gian vận hành", description: "Một nơi truy cập hạ tầng. Đúng khách hàng, đúng quyền hạn." },
  customers: { title: "Khách hàng", description: "Tổ chức tài nguyên theo từng khách hàng và vùng kết nối độc lập." },
  connectors: { title: "Connector & VPN", description: "Đường kết nối từ bastion đến mạng khách hàng, không phải từ máy của bạn." },
  members: { title: "Thành viên & quyền", description: "Cấp quyền theo khách hàng. Mỗi thành viên chỉ thấy tài nguyên được giao." },
  audit: { title: "Nhật ký truy cập", description: "Theo dõi thao tác trong lần trải nghiệm này. Chưa phải audit bảo mật phía server." },
  security: { title: "Bảo mật", description: "Phân biệt những gì đang được mô phỏng và điều kiện cần trước khi dùng thật." },
};

type Modal = { type: "connect"; resourceId: string } | { type: "member"; userId: string } | { type: "invite" } | { type: "resource" } | { type: "reset" } | null;

function ModalShell({ title, description, children, onClose }: { title: string; description?: string; children: React.ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return <dialog ref={dialog} className="demo-modal" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="modal-heading">
    <div className="modal-heading"><div><h2 id="modal-heading">{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Đóng hộp thoại"><X size={19} /></button></div>
    {children}
  </dialog>;
}

function Badge({ children, kind = "neutral" }: { children: React.ReactNode; kind?: "good" | "warning" | "neutral" | "accent" }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

export interface DemoAppProps {
  onOpenInWorkspace?: (resource: Resource) => void;
  onActiveUserChange?: (userName: string, userRole: string) => void;
}

export default function DemoApp({ onOpenInWorkspace, onActiveUserChange }: DemoAppProps = {}) {
  const [users, setUsers] = useState(initialUsers);
  const [connectors, setConnectors] = useState(initialConnectors);
  const [resources, setResources] = useState(initialResources);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loginId, setLoginId] = useState("admin");
  const [page, setPage] = useState<Page>("workspace");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [tabs, setTabs] = useState<DemoTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"inventory" | "terminal">("inventory");
  const [command, setCommand] = useState("");
  const [terminalSide, setTerminalSide] = useState<"files" | "details">("details");
  const [grantDraft, setGrantDraft] = useState<string[]>([]);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCustomer, setFormCustomer] = useState("atlas");
  const [formProtocol, setFormProtocol] = useState<Resource["protocol"]>("SSH");
  const [formError, setFormError] = useState("");
  const [connectAcknowledged, setConnectAcknowledged] = useState(false);
  const terminalEnd = useRef<HTMLDivElement>(null);
  const user = users.find(item => item.id === currentId && item.active);
  const isAdmin = user?.role === "admin";
  const visibleCustomers = CUSTOMERS.filter(item => user?.customerIds.includes(item.id));
  const visibleResources = resources.filter(item => user?.customerIds.includes(item.customerId));
  const visibleConnectors = connectors.filter(item => user?.customerIds.includes(item.customerId));
  const filteredResources = useMemo(() => visibleResources.filter(item =>
    (customerFilter === "all" || item.customerId === customerFilter) &&
    (protocolFilter === "all" || item.protocol === protocolFilter) &&
    `${item.name} ${item.host} ${customerName(item.customerId)}`.toLowerCase().includes(query.toLowerCase())
  ), [visibleResources, customerFilter, protocolFilter, query]);
  const activeTab = tabs.find(item => item.id === activeTabId);
  const activeResource = activeTab && resources.find(item => item.id === activeTab.resourceId);
  const modalResource = modal?.type === "connect" ? resources.find(item => item.id === modal.resourceId) : undefined;
  const editedUser = modal?.type === "member" ? users.find(item => item.id === modal.userId) : undefined;

  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(""), 6000); return () => clearTimeout(timer); } }, [notice]);
  useEffect(() => { terminalEnd.current?.scrollIntoView({ block: "nearest" }); }, [activeTab?.lines.length, activeTabId]);

  function audit(action: string, target: string, result: AuditEvent["result"] = "success", actor = user?.name || "Demo") {
    setEvents(previous => [{ id: demoId(), time: new Date().toISOString(), actor, action, target, result }, ...previous].slice(0, 500));
  }
  function login(id: string) {
    const next = users.find(item => item.id === id && item.active);
    if (!next) { setNotice("Tài khoản demo đã bị vô hiệu hóa."); return; }
    setCurrentId(next.id); setPage("workspace"); setCustomerFilter("all"); setQuery(""); setProtocolFilter("all");
    setTabs([]); setActiveTabId(null); setWorkspaceMode("inventory"); setModal(null); setSidebarOpen(false); setCommand("");
    audit("Đăng nhập mô phỏng", next.email, "notice", next.name);
    onActiveUserChange?.(next.name, next.role);
  }
  function logout() {
    audit("Đăng xuất · đóng toàn bộ tab demo", user?.email || "");
    setCurrentId(null); setTabs([]); setActiveTabId(null); setModal(null); setCommand("");
    onActiveUserChange?.("", "");
  }
  function navigate(next: Page) {
    if (NAV.find(item => item.id === next)?.admin && !isAdmin) return;
    setPage(next); setSidebarOpen(false);
  }
  function requestConnect(resource: Resource) {
    if (!user?.customerIds.includes(resource.customerId)) { audit("Từ chối mở phiên", resource.name, "denied"); return; }
    const connector = connectors.find(item => item.customerId === resource.customerId);
    if (!connector?.online) { audit("Connector ngoại tuyến", resource.name, "denied"); setNotice("Không mở phiên: connector của khách hàng đang ngoại tuyến."); return; }
    setConnectAcknowledged(false); setModal({ type: "connect", resourceId: resource.id });
  }
  function openConnection() {
    if (!modalResource || !connectAcknowledged || !user?.customerIds.includes(modalResource.customerId)) return;
    if (!connectors.some(item => item.customerId === modalResource.customerId && item.online)) { setModal(null); setNotice("Connector đã ngoại tuyến. Không mở phiên."); return; }
    if (onOpenInWorkspace) {
      onOpenInWorkspace(modalResource);
      audit("Mở phiên trong Workspace Pro", `${customerName(modalResource.customerId)} / ${modalResource.name}`, "notice");
      setModal(null);
      return;
    }
    const tab: DemoTab = { id: demoId(), resourceId: modalResource.id, status: "open", lines: [
      "OMNITERM / DEMO SESSION", "────────────────────────────────────────────────────",
      `Khách hàng: ${customerName(modalResource.customerId)}`, `Đích mẫu: ${modalResource.host}:${modalResource.port} · ${modalResource.protocol}`,
      `Tài khoản mẫu: ${modalResource.account}`, "", "Đây là mô phỏng trên trình duyệt. Không có kết nối mạng tới máy đích.",
      "Không nhập bí mật thật. Gõ help để xem các lệnh mẫu.", "",
    ] };
    setTabs(previous => [...previous, tab]); setActiveTabId(tab.id); setWorkspaceMode("terminal"); setPage("workspace"); setCommand("");
    audit("Mở phiên mô phỏng", `${customerName(modalResource.customerId)} / ${modalResource.name}`, "notice"); setModal(null);
  }
  function closeTab(id: string) {
    const tab = tabs.find(item => item.id === id);
    const resource = resources.find(item => item.id === tab?.resourceId);
    audit("Đóng tab mô phỏng", resource?.name || id);
    const next = tabs.filter(item => item.id !== id);
    setTabs(next);
    if (activeTabId === id) { setActiveTabId(next.at(-1)?.id || null); setCommand(""); }
    if (!next.length) setWorkspaceMode("inventory");
  }
  function runCommand(event: React.FormEvent) {
    event.preventDefault();
    if (!activeTab || !activeResource || activeTab.status !== "open") return;
    if (!user?.customerIds.includes(activeResource.customerId) || !connectors.some(item => item.customerId === activeResource.customerId && item.online)) return;
    const input = command.trim();
    if (input === "clear") setTabs(previous => previous.map(item => item.id === activeTab.id ? { ...item, lines: [] } : item));
    else setTabs(previous => previous.map(item => item.id === activeTab.id ? {
      ...item, status: input === "exit" ? "closed" : item.status, reason: input === "exit" ? "Bạn đã kết thúc phiên mô phỏng." : item.reason,
      lines: [...item.lines, `${activeResource.account}@${activeResource.name}:~$ ${command}`, ...simulateCommand(input === "exit" ? "" : input, activeResource)].slice(-500),
    } : item));
    if (input === "exit") audit("Kết thúc phiên mô phỏng", activeResource.name);
    setCommand("");
  }
  function toggleConnector(id: string) {
    if (!isAdmin) return;
    const connector = connectors.find(item => item.id === id);
    if (!connector) return;
    setConnectors(previous => previous.map(item => item.id === id ? { ...item, online: !item.online } : item));
    if (connector.online) {
      setTabs(previous => previous.map(tab => resources.some(resource => resource.id === tab.resourceId && resource.customerId === connector.customerId) ? { ...tab, status: "closed", reason: "Connector đã ngắt. Phiên mô phỏng đã kết thúc." } : tab));
    }
    audit(connector.online ? "Ngắt connector mô phỏng" : "Bật connector mô phỏng", connector.name, "notice");
    setNotice(connector.online ? "Đã ngắt connector và kết thúc các phiên demo liên quan." : "Connector demo đã trực tuyến.");
  }
  function editMember(member: DemoUser) { setGrantDraft([...member.customerIds]); setModal({ type: "member", userId: member.id }); }
  function toggleGrant(id: string) { setGrantDraft(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]); }
  function saveMember() {
    if (!isAdmin || !editedUser || editedUser.role === "admin") return;
    setUsers(previous => previous.map(item => item.id === editedUser.id ? { ...item, customerIds: [...grantDraft] } : item));
    audit("Cập nhật phạm vi khách hàng", `${editedUser.name}: ${grantDraft.map(customerName).join(", ") || "không có quyền"}`);
    setModal(null); setNotice("Đã cập nhật quyền demo. Chuyển sang tài khoản thành viên để kiểm tra.");
  }
  function toggleMember(member: DemoUser) {
    if (!isAdmin || member.role === "admin") return;
    setUsers(previous => previous.map(item => item.id === member.id ? { ...item, active: !item.active } : item));
    audit(member.active ? "Vô hiệu hóa thành viên" : "Kích hoạt thành viên", member.name);
  }
  function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!isAdmin) return;
    if (!formName.trim() || !/^[a-zA-Z0-9._+-]+@example\.invalid$/.test(formEmail)) { setFormError("Chỉ dùng tên mẫu và email dạng ten@example.invalid. Không nhập email thật."); return; }
    if (users.some(item => item.email.toLowerCase() === formEmail.toLowerCase())) { setFormError("Email mẫu này đã tồn tại."); return; }
    setUsers(previous => [...previous, { id: demoId(), name: formName.trim(), email: formEmail.toLowerCase(), role: "technician", active: true, customerIds: [...grantDraft] }]);
    audit("Thêm thành viên demo", formName.trim(), "notice"); setModal(null); setNotice("Đã thêm thành viên mẫu. Không có email nào được gửi.");
  }
  function submitResource(event: React.FormEvent) {
    event.preventDefault();
    if (!isAdmin || !formName.trim()) return;
    const customer = CUSTOMERS.find(item => item.id === formCustomer);
    if (!customer) return;
    const host = `${customer.network.split(".").slice(0, 3).join(".")}.50`;
    setResources(previous => [...previous, { id: demoId(), customerId: formCustomer, name: formName.trim(), host, port: formProtocol === "SSH" ? 22 : formProtocol === "RDP" ? 3389 : 23, protocol: formProtocol, environment: "Staging", account: "operator-demo", credentialLabel: "Placeholder · chưa có bí mật" }]);
    audit("Thêm tài nguyên mẫu", `${customer.name} / ${formName.trim()}`, "notice"); setModal(null); setNotice("Đã tạo profile mẫu, không có credential hay kết nối thật.");
  }
  function resetDemo() {
    setUsers(initialUsers()); setConnectors(initialConnectors()); setResources(initialResources()); setEvents([]); setTabs([]); setCurrentId(null); setLoginId("admin"); setModal(null); setNotice("Đã khôi phục dữ liệu demo ban đầu.");
  }
  function grantChoices() {
    return <div className="grant-options">{CUSTOMERS.map(customer => <label key={customer.id} className={`grant-choice ${grantDraft.includes(customer.id) ? "selected" : ""}`}><input type="checkbox" checked={grantDraft.includes(customer.id)} onChange={() => toggleGrant(customer.id)} /><span className="customer-monogram">{customer.code}</span><span><strong>{customer.name}</strong><small>{customer.zone} · tài nguyên mẫu</small></span></label>)}</div>;
  }

  if (!user) return <div className="omni-demo login-root">
    <div className="login-brand"><span className="brand-symbol"><Terminal size={23} /></span><strong>OmniTerm<span> / ACCESS WORKSPACE</span></strong></div>
    <main className="login-layout">
      <section className="login-story"><span className="overline">BASTION WORKSPACE · INTERACTIVE DEMO</span><h1>Hạ tầng phân tán.<br />Vận hành tập trung.</h1><p>Một không gian làm việc cho team kỹ thuật. Truy cập tài nguyên khách hàng qua connector riêng, không cần cài ứng dụng quản lý session trên từng máy.</p><div className="login-path"><span><Monitor size={20} /> Trình duyệt</span><ChevronRight size={16} /><span><ShieldCheck size={20} /> Bastion</span><ChevronRight size={16} /><span><Network size={20} /> VPN khách hàng</span></div><div className="login-footnote"><LockKeyhole size={18} /><span>Bản thử nghiệm chỉ có dữ liệu hư cấu.<br />Không kết nối Google, VPN hay máy khách hàng thật.</span></div></section>
      <section className="login-card" aria-labelledby="login-title"><Badge kind="accent">BẢN TRẢI NGHIỆM</Badge><h2 id="login-title">Vào không gian demo</h2><p>Chọn vai trò để trải nghiệm cách phân quyền và vận hành.</p><label className="field-label" htmlFor="demo-account">Tài khoản mẫu</label><select id="demo-account" value={loginId} onChange={event => setLoginId(event.target.value)}>{users.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name} · {item.role === "admin" ? "Quản trị viên" : "Kỹ thuật viên"}</option>)}</select><div className="login-role-note">{loginId === "admin" ? "Admin Demo được cấp toàn bộ dữ liệu mẫu để thử quản trị." : "Thành viên chỉ thấy khách hàng và tài nguyên được admin cấp."}</div><button className="button primary login-submit" onClick={() => login(loginId)}><ArrowUpRight size={18} /> Vào demo — không đăng nhập Google thật</button><div className="login-divider" /><p className="small-text">Google SSO và MFA là bước triển khai tiếp theo. Demo không yêu cầu mật khẩu hoặc mã Authenticator.</p><div className="privacy-note"><ShieldAlert size={17} /><span>Thay đổi chỉ nằm trong bộ nhớ của trang; tải lại sẽ reset. Không nhập dữ liệu nhạy cảm.</span></div></section>
    </main>{notice && <div role="status" className="toast">{notice}</div>}
  </div>;

  return <div className="omni-demo app-root">
    <aside className={`app-sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
      <a href="#workspace" className="app-brand" onClick={event => { event.preventDefault(); navigate("workspace"); }}><span className="brand-symbol"><Terminal size={23} /></span><span><strong>OmniTerm</strong><small>ACCESS WORKSPACE</small></span></a>
      <div className="organization"><span className="org-icon"><Building2 size={18} /></span><div><strong>Team Operations</strong><small>Không gian mẫu · 3–5 người</small></div><Badge>DEMO</Badge></div>
      <div className="sidebar-section-label">WORKSPACE</div><nav aria-label="Điều hướng chính">{NAV.filter(item => !item.admin || isAdmin).map(item => <button key={item.id} className={`nav-button ${page === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}><item.icon size={18} /><span>{item.label}</span>{item.id === "workspace" && <span className="nav-count">{visibleResources.length}</span>}</button>)}</nav>
      <div className="sidebar-section-label customer-label">KHÁCH HÀNG ĐƯỢC CẤP</div><div className="sidebar-customers">{visibleCustomers.map(customer => <button key={customer.id} onClick={() => { setCustomerFilter(customer.id); navigate("workspace"); setWorkspaceMode("inventory"); }}><span className={`small-dot ${connectors.some(item => item.customerId === customer.id && item.online) ? "online" : "offline"}`} /><span>{customer.name}</span><ChevronRight size={13} /></button>)}{!visibleCustomers.length && <p className="small-text">Chưa được cấp khách hàng.</p>}</div>
      <div className="sidebar-bottom"><div className="demo-disclaimer"><ShieldAlert size={17} /><div><strong>Môi trường mô phỏng</strong><p>Không có kết nối hoặc bí mật thật. Dữ liệu reset khi tải lại.</p></div></div><button className="reset-link" onClick={() => setModal({ type: "reset" })}><RotateCcw size={14} /> Khôi phục demo</button><div className="user-profile"><span className="avatar">{user.name.split(" ").slice(0, 2).map(part => part[0]).join("")}</span><div><strong>{user.name}</strong><small>{isAdmin ? "Quản trị viên demo" : "Kỹ thuật viên demo"}</small></div><button className="icon-button" onClick={logout} aria-label="Đăng xuất demo"><LogOut size={17} /></button></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}
    <div className="app-content"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Mở menu"><Menu size={20} /></button><span>Team Operations</span><ChevronRight size={14} /><strong>{PAGE_COPY[page].title}</strong></div><div className="topbar-actions"><Badge kind="warning">DEMO · không phải phiên thật</Badge><label className="account-switch"><span>Trải nghiệm vai trò</span><select aria-label="Chuyển tài khoản demo" value={user.id} onChange={event => login(event.target.value)}>{users.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></header>
      <main className="page-main"><div className="page-heading"><div><div className="overline">{page === "workspace" ? "CENTRALIZED ACCESS" : "TEAM OPERATIONS"}</div><h1>{PAGE_COPY[page].title}</h1><p>{PAGE_COPY[page].description}</p></div><div className="heading-actions">{isAdmin && page === "workspace" && <button className="button primary" onClick={() => { setFormName(""); setFormCustomer("atlas"); setFormProtocol("SSH"); setModal({ type: "resource" }); }}><Plus size={17} /> Thêm tài nguyên mẫu</button>}{isAdmin && page === "members" && <button className="button primary" onClick={() => { setFormName(""); setFormEmail(""); setGrantDraft([]); setFormError(""); setModal({ type: "invite" }); }}><Plus size={17} /> Thêm thành viên mẫu</button>}</div></div>

      {page === "workspace" && <>
        <div className="workspace-tabs"><button className={workspaceMode === "inventory" ? "selected" : ""} onClick={() => setWorkspaceMode("inventory")}><Server size={16} /> Tài nguyên <span>{visibleResources.length}</span></button><button className={workspaceMode === "terminal" ? "selected" : ""} onClick={() => setWorkspaceMode("terminal")}><Terminal size={16} /> Phiên mô phỏng <span>{tabs.length}</span></button><div className="workspace-note"><LockKeyhole size={13} /> Cấp quyền theo khách hàng</div></div>
        {workspaceMode === "inventory" ? <>
          <div className="filter-row"><label className="search-field"><Search size={17} /><input aria-label="Tìm tài nguyên" placeholder="Tìm tên máy, IP hoặc khách hàng…" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Lọc khách hàng" value={customerFilter} onChange={event => setCustomerFilter(event.target.value)}><option value="all">Tất cả khách hàng</option>{visibleCustomers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><select aria-label="Lọc giao thức" value={protocolFilter} onChange={event => setProtocolFilter(event.target.value)}><option value="all">Mọi giao thức</option>{["SSH", "RDP", "Telnet"].map(protocol => <option key={protocol}>{protocol}</option>)}</select></div>
          <div className="resource-list">{filteredResources.length ? visibleCustomers.filter(customer => filteredResources.some(resource => resource.customerId === customer.id)).map(customer => {
            const connector = connectors.find(item => item.customerId === customer.id);
            return <section key={customer.id} className="resource-group"><div className="resource-group-heading"><div className="customer-title"><span className="customer-monogram">{customer.code}</span><div><h2>{customer.name}</h2><span>{customer.zone} · {connector?.name}</span></div></div><Badge kind={connector?.online ? "good" : "warning"}><span className={`small-dot ${connector?.online ? "online" : "offline"}`} />{connector?.online ? "VPN mô phỏng online" : "Connector ngoại tuyến"}</Badge></div><div className="table-scroll"><table className="resource-table"><thead><tr><th>Tài nguyên</th><th>Giao thức</th><th>Địa chỉ mẫu</th><th>Môi trường</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{filteredResources.filter(resource => resource.customerId === customer.id).map(resource => <tr key={resource.id}><td><div className="resource-name"><span className={`protocol-icon ${resource.protocol.toLowerCase()}`}>{resource.protocol === "RDP" ? <Monitor size={18} /> : <Terminal size={18} />}</span><div><strong>{resource.name}</strong><small>{resource.account}</small></div></div></td><td><Badge kind={resource.protocol === "Telnet" ? "warning" : "neutral"}>{resource.protocol}</Badge></td><td><code>{resource.host}<span className="muted">:{resource.port}</span></code></td><td><span className={`environment ${resource.environment.toLowerCase()}`}><span />{resource.environment}</span></td><td className="row-actions"><button className="button connect-button" onClick={() => requestConnect(resource)} aria-label={`Kết nối ${resource.name}`}>{connector?.online ? "Kết nối demo" : "Kiểm tra"}<ArrowUpRight size={15} /></button></td></tr>)}</tbody></table></div></section>;
          }) : <div className="empty-state"><Search size={30} /><h2>Không có tài nguyên phù hợp</h2><p>Thử đổi bộ lọc hoặc nhờ admin cấp quyền cho tài khoản demo này.</p><button className="button" onClick={() => { setQuery(""); setCustomerFilter("all"); setProtocolFilter("all"); }}>Xóa bộ lọc</button></div>}</div>
          <div className="inventory-footnote"><CircleHelp size={16} /><span>Địa chỉ, tài khoản và trạng thái đều là dữ liệu mẫu. Chọn <strong>Kết nối demo</strong> để trải nghiệm, không có lệnh nào chạy trên server.</span></div>
        </> : <>
          {!tabs.length ? <div className="empty-state terminal-empty"><Terminal size={34} /><h2>Chưa có phiên mô phỏng</h2><p>Chọn một tài nguyên để thử terminal, thông tin kết nối và luồng đóng phiên.</p><button className="button primary" onClick={() => setWorkspaceMode("inventory")}>Chọn tài nguyên <ArrowUpRight size={16} /></button></div> : <div className="terminal-workspace"><div className="session-tabs">{tabs.map(tab => <div key={tab.id} className={`session-tab ${tab.id === activeTabId ? "selected" : ""}`}><button onClick={() => { setActiveTabId(tab.id); setCommand(""); }}><span className={`small-dot ${tab.status === "open" ? "online" : "offline"}`} />{resources.find(resource => resource.id === tab.resourceId)?.name}</button><button aria-label={`Đóng ${resources.find(resource => resource.id === tab.resourceId)?.name}`} onClick={() => closeTab(tab.id)}><X size={14} /></button></div>)}<button className="icon-button" aria-label="Mở thêm tài nguyên" onClick={() => setWorkspaceMode("inventory")}><Plus size={17} /></button></div>
          {activeResource && activeTab && <><div className="terminal-context"><div><Badge kind="warning">MÔ PHỎNG</Badge><span>{customerName(activeResource.customerId)}</span><ChevronRight size={13} /><code>{activeResource.host}:{activeResource.port}</code></div><span>{activeTab.status === "open" ? "Phiên demo đang mở" : "Phiên demo đã đóng"}</span></div><div className="terminal-body"><section className="terminal-screen" aria-label="Terminal mô phỏng">
          {activeResource.protocol === "RDP" ? <div className="rdp-preview"><Monitor size={44} /><h2>Remote Desktop Preview</h2><p>Đây là khung xem trước cho {activeResource.name}.</p><p>RDP thật cần gateway phía server, chưa có trong demo.</p><Badge kind="warning">Không có Windows desktop đang chạy</Badge></div> : <><div className="terminal-output" role="log" aria-label="Kết quả terminal">{activeTab.lines.map((line, index) => <div key={index}>{line || " "}</div>)}<div ref={terminalEnd} /></div>{activeTab.status === "open" && <form className="terminal-command" onSubmit={runCommand}><label htmlFor="terminal-input">{activeResource.account}@{activeResource.name}:~$</label><input id="terminal-input" aria-label="Lệnh terminal mô phỏng" autoComplete="off" spellCheck={false} value={command} onChange={event => setCommand(event.target.value)} maxLength={300} /><button type="submit" aria-label="Chạy lệnh mẫu"><Play size={14} /></button></form>}</>}
          {activeTab.status === "closed" && <div className="session-closed"><Unplug size={17} />{activeTab.reason || "Phiên đã kết thúc."}<button onClick={() => requestConnect(activeResource)}>Mở lại demo</button></div>}</section>
          <aside className="terminal-inspector"><div className="inspector-tabs"><button className={terminalSide === "details" ? "selected" : ""} onClick={() => setTerminalSide("details")}>Kết nối</button><button className={terminalSide === "files" ? "selected" : ""} onClick={() => setTerminalSide("files")}>File mẫu</button></div>{terminalSide === "details" ? <><div className="inspector-section"><h3>ĐƯỜNG KẾT NỐI MẪU</h3><ol className="connection-route"><li><Monitor size={15} /><div>Trình duyệt<small>{user.name}</small></div></li><li><ShieldCheck size={15} /><div>OmniTerm bastion<small>HTTPS / WSS · dự kiến</small></div></li><li><Network size={15} /><div>{connectors.find(item => item.customerId === activeResource.customerId)?.name}<small>VPN tách biệt · mô phỏng</small></div></li><li><Server size={15} /><div>{activeResource.name}<small>{activeResource.protocol} · {activeResource.port}</small></div></li></ol></div><div className="inspector-section"><h3>CREDENTIAL</h3><p>{activeResource.credentialLabel}</p><span className="small-text">Chỉ có nhãn mẫu. Không lưu hay hiển thị mật khẩu/private key.</span></div></> : <div className="inspector-section"><Badge>CHỈ XEM MẪU</Badge><ul className="sample-files"><li><Folder size={16} /> deployments</li><li><Folder size={16} /> logs</li><li><FileText size={16} /> README.demo.txt</li></ul><p className="small-text">Chưa kết nối SFTP. Không có upload, download hoặc file khách hàng thật.</p></div>}</aside></div></>}
          </div>}
        </>}
      </>}

      {page === "customers" && <div className="customer-grid">{visibleCustomers.map(customer => <section className="customer-card" key={customer.id}><div className="customer-card-top"><span className="customer-monogram large">{customer.code}</span><Badge kind={connectors.some(item => item.customerId === customer.id && item.online) ? "good" : "warning"}>{connectors.some(item => item.customerId === customer.id && item.online) ? "Connector online · demo" : "Ngoại tuyến · demo"}</Badge></div><h2>{customer.name}</h2><p>{customer.description}</p><dl><div><dt>Vùng mạng riêng</dt><dd>{customer.zone}</dd></div><div><dt>Subnet mẫu</dt><dd><code>{customer.network}</code></dd></div><div><dt>Tài nguyên được cấp</dt><dd>{visibleResources.filter(item => item.customerId === customer.id).length}</dd></div></dl><button className="button full-width" onClick={() => { setCustomerFilter(customer.id); setWorkspaceMode("inventory"); navigate("workspace"); }}>Xem tài nguyên<ArrowUpRight size={16} /></button></section>)}{!visibleCustomers.length && <div className="empty-state"><LockKeyhole size={30} /><h2>Chưa có khách hàng được cấp</h2><p>Quản trị viên cần cấp quyền cho tài khoản này.</p></div>}</div>}

      {page === "connectors" && <><div className="info-banner"><Network size={19} /><div><strong>VPN nằm ở phía connector, không nằm trên PC người dùng.</strong><p>Demo minh họa tách đường kết nối từng khách hàng. Nút bật/tắt chỉ đổi trạng thái mẫu, không cấu hình VPN thật.</p></div></div><div className="connector-list">{visibleConnectors.map(connector => <section key={connector.id} className="connector-card"><div className="connector-card-title"><span className="connector-symbol"><Cable size={23} /></span><div><h2>{connector.name}</h2><p>{customerName(connector.customerId)} · connector riêng</p></div><Badge kind={connector.online ? "good" : "warning"}>{connector.online ? "Online · mô phỏng" : "Offline · mô phỏng"}</Badge></div><div className="connector-details"><div><span>Loại VPN mẫu</span><strong>{connector.vpn}</strong></div><div><span>Route mẫu</span><code>{connector.route}</code></div><div><span>Vùng cách ly dự kiến</span><strong>{CUSTOMERS.find(item => item.id === connector.customerId)?.zone}</strong></div><div><span>Kiểm tra thực tế</span><strong>Chưa thực hiện</strong></div></div>{isAdmin && <div className="connector-actions"><span className="small-text">{connector.online ? "Ngắt sẽ kết thúc các phiên demo liên quan." : "Bật để thử mở tài nguyên của khách hàng này."}</span><button className={`button ${connector.online ? "danger-quiet" : "primary"}`} onClick={() => toggleConnector(connector.id)}>{connector.online ? <Unplug size={16} /> : <Play size={16} />}{connector.online ? "Ngắt mô phỏng" : "Bật mô phỏng"}</button></div>}</section>)}</div></>}

      {page === "members" && isAdmin && <><div className="info-banner"><Users size={19} /><div><strong>Thử cấp quyền, rồi chuyển vai trò ở góc trên bên phải.</strong><p>Thay đổi quyền khách hàng cho Linh Demo hoặc Minh Demo để kiểm tra danh sách tài nguyên. Đây là kiểm soát UI mô phỏng, không phải ranh giới bảo mật backend.</p></div></div><div className="table-panel table-scroll"><table className="members-table"><thead><tr><th>Thành viên</th><th>Vai trò</th><th>Khách hàng được cấp</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{users.map(member => <tr key={member.id}><td><div className="member-name"><span className="avatar">{member.name[0]}</span><div><strong>{member.name}</strong><small>{member.email}</small></div></div></td><td><Badge kind={member.role === "admin" ? "accent" : "neutral"}>{member.role === "admin" ? "Admin demo" : "Kỹ thuật viên"}</Badge></td><td><div className="customer-chips">{member.customerIds.map(id => <Badge key={id}>{customerName(id)}</Badge>)}{!member.customerIds.length && <span className="small-text">Chưa có quyền</span>}</div></td><td><span className={`text-status ${member.active ? "good-text" : "muted"}`}><span className={`small-dot ${member.active ? "online" : "offline"}`} />{member.active ? "Hoạt động" : "Vô hiệu hóa"}</span></td><td>{member.role !== "admin" ? <div className="member-actions"><button className="button compact" onClick={() => editMember(member)} aria-label={`Phân quyền ${member.name}`}><Settings2 size={14} /> Phân quyền</button><button className="text-button" onClick={() => toggleMember(member)}>{member.active ? "Khóa" : "Mở khóa"}</button></div> : <span className="small-text">Tài khoản quản trị mẫu</span>}</td></tr>)}</tbody></table></div><p className="section-footnote">Demo cấp quyền ở mức khách hàng. Quyền theo từng resource, JIT và phê duyệt sẽ được triển khai ở backend sau.</p></>}

      {page === "audit" && isAdmin && <><div className="audit-toolbar"><Badge kind="accent">{events.length} sự kiện trong lần trải nghiệm</Badge><span className="small-text">Bộ nhớ tạm · tối đa 500 sự kiện · không ghi nội dung lệnh</span></div><div className="table-panel table-scroll"><table className="audit-table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Thao tác</th><th>Đối tượng</th><th>Kết quả</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td><time dateTime={event.time}>{new Date(event.time).toLocaleTimeString("vi-VN")}</time></td><td>{event.actor}</td><td>{event.action}</td><td>{event.target}</td><td><Badge kind={event.result === "denied" ? "warning" : event.result === "notice" ? "neutral" : "good"}>{event.result === "denied" ? "Bị từ chối" : event.result === "notice" ? "Mô phỏng" : "Đã cập nhật demo"}</Badge></td></tr>)}</tbody></table></div><p className="section-footnote">Đây không phải log chống sửa đổi. Audit production cần lưu phía server, có kiểm soát quyền và retention.</p></>}

      {page === "security" && <><div className="security-overview"><span className="security-emblem"><ShieldAlert size={31} /></span><div><Badge kind="warning">CHƯA DÙNG CHO PRODUCTION</Badge><h2>Demo trải nghiệm, chưa phải bastion bảo mật.</h2><p>Không nhập credential hay dữ liệu khách hàng. Mọi thay đổi chỉ nằm trong bộ nhớ trang; không có kết nối thật và không gửi đến API quản trị.</p></div></div><div className="security-list">{[
        ["Google SSO & MFA", "Chưa tích hợp", "Nút vào demo không liên hệ Google, không xác thực mật khẩu hay mã OTP."],
        ["Quyền truy cập", "Mô phỏng giao diện", "Danh sách theo khách hàng minh họa trải nghiệm. Người mở DevTools có thể xem dữ liệu mẫu; đây không phải cơ chế bảo mật."],
        ["SSH / RDP / Telnet", "Chưa kết nối", "Terminal chỉ trả kết quả dựng sẵn. Telnet thật không mã hóa đoạn tới thiết bị và phải là ngoại lệ."],
        ["VPN & cách ly mạng", "Trạng thái mẫu", "Không mở tunnel. Production cần connector riêng, giới hạn đích và kiểm thử trùng subnet/cách ly khách hàng."],
        ["Credential vault", "Chưa triển khai", "Chỉ có nhãn credential mẫu. Không có mật khẩu/private key để xem hoặc xuất."],
        ["Audit & recording", "Nhật ký tạm", "Chỉ ghi sự kiện demo trong bộ nhớ. Chưa recording, lưu bất biến hoặc chính sách retention."],
      ].map(([title, status, description]) => <section className="security-row" key={title}><LockKeyhole size={19} /><div><h3>{title}</h3><p>{description}</p></div><Badge kind="warning">{status}</Badge></section>)}</div><div className="info-banner"><Eye size={19} /><div><strong>Vòng kiểm thử trải nghiệm đề xuất</strong><p>Admin → mở SSH demo → đổi quyền Linh → chuyển sang Linh → kiểm tra tài nguyên → quay lại admin → ngắt connector → xem nhật ký.</p></div></div></>}
      </main><footer className="app-footer"><span>OmniTerm · Prototype 0.2</span><span><span className="small-dot offline" /> Chỉ mô phỏng · dữ liệu hư cấu · không lưu sau khi tải lại</span></footer>
    </div>
    {notice && <div className="toast" role="status"><CircleHelp size={18} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Đóng thông báo"><X size={16} /></button></div>}

    {modal?.type === "connect" && modalResource && <ModalShell title={`Mở ${modalResource.protocol} demo`} description="Kiểm tra đường kết nối trước khi mở phiên mô phỏng." onClose={() => setModal(null)}><div className="connect-summary"><div><span>Khách hàng</span><strong>{customerName(modalResource.customerId)}</strong></div><div><span>Tài nguyên mẫu</span><strong>{modalResource.name}</strong></div><div><span>Địa chỉ mẫu</span><code>{modalResource.host}:{modalResource.port}</code></div><div><span>Connector</span><strong>{connectors.find(item => item.customerId === modalResource.customerId)?.name}</strong></div><div><span>Tài khoản đích mẫu</span><strong>{modalResource.account}</strong></div></div>{modalResource.protocol === "Telnet" && <div className="warning-box">Telnet không mã hóa kết nối tới thiết bị. Bản thật chỉ cho phép theo ngoại lệ được phê duyệt.</div>}<div className="warning-box">Không có kết nối thật. Host key, VPN, credential và MFA chưa được xác minh. Không nhập bí mật khách hàng.</div><label className="acknowledgment"><input type="checkbox" checked={connectAcknowledged} onChange={event => setConnectAcknowledged(event.target.checked)} /><span>Tôi hiểu đây chỉ là mô phỏng, không thực thi lệnh trên máy đích.</span></label><div className="modal-actions"><button className="button" onClick={() => setModal(null)}>Hủy</button><button className="button primary" disabled={!connectAcknowledged} onClick={openConnection}>Mở phiên demo<ArrowUpRight size={16} /></button></div></ModalShell>}
    {modal?.type === "member" && editedUser && isAdmin && <ModalShell title={`Phân quyền · ${editedUser.name}`} description="Cho phép xem và mở mọi tài nguyên mẫu thuộc khách hàng được chọn." onClose={() => setModal(null)}>{grantChoices()}<p className="small-text">Bỏ tất cả lựa chọn để thu hồi toàn bộ quyền khách hàng trong demo.</p><div className="modal-actions"><button className="button" onClick={() => setModal(null)}>Hủy</button><button className="button primary" onClick={saveMember}><Check size={16} />Lưu quyền demo</button></div></ModalShell>}
    {modal?.type === "invite" && isAdmin && <ModalShell title="Thêm thành viên mẫu" description="Không tạo tài khoản thật và không gửi thư mời." onClose={() => setModal(null)}><form onSubmit={submitInvite}><label className="field-label" htmlFor="invite-name">Tên hiển thị mẫu</label><input id="invite-name" required maxLength={60} value={formName} onChange={event => setFormName(event.target.value)} placeholder="Thanh Demo" /><label className="field-label" htmlFor="invite-email">Email mẫu · chỉ example.invalid</label><input id="invite-email" type="email" required value={formEmail} onChange={event => setFormEmail(event.target.value)} placeholder="thanh@example.invalid" maxLength={120} /><label className="field-label">Khách hàng được cấp</label>{grantChoices()}{formError && <p role="alert" className="form-error">{formError}</p>}<div className="modal-actions"><button type="button" className="button" onClick={() => setModal(null)}>Hủy</button><button type="submit" className="button primary">Thêm vào demo</button></div></form></ModalShell>}
    {modal?.type === "resource" && isAdmin && <ModalShell title="Thêm tài nguyên mẫu" description="Chỉ tạo profile demo với địa chỉ tài liệu; không nhập IP hay credential thật." onClose={() => setModal(null)}><form onSubmit={submitResource}><label className="field-label" htmlFor="resource-name">Tên máy mẫu</label><input id="resource-name" required maxLength={60} value={formName} onChange={event => setFormName(event.target.value)} placeholder="app-demo-02" /><label className="field-label" htmlFor="resource-customer">Khách hàng</label><select id="resource-customer" value={formCustomer} onChange={event => setFormCustomer(event.target.value)}>{CUSTOMERS.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><label className="field-label" htmlFor="resource-protocol">Giao thức</label><select id="resource-protocol" value={formProtocol} onChange={event => setFormProtocol(event.target.value as Resource["protocol"])}><option>SSH</option><option>RDP</option><option>Telnet</option></select><p className="small-text">IP mẫu được sinh tự động trong dải tài liệu. Không có mật khẩu hoặc private key.</p><div className="modal-actions"><button type="button" className="button" onClick={() => setModal(null)}>Hủy</button><button className="button primary" type="submit">Tạo profile demo</button></div></form></ModalShell>}
    {modal?.type === "reset" && <ModalShell title="Khôi phục dữ liệu demo?" description="Các tài nguyên, thành viên, quyền và nhật ký vừa thử sẽ bị xóa khỏi bộ nhớ trang. Bạn sẽ trở về màn hình vào demo." onClose={() => setModal(null)}><div className="modal-actions"><button className="button" onClick={() => setModal(null)}>Giữ nguyên</button><button className="button primary" onClick={resetDemo}><RotateCcw size={16} />Khôi phục demo</button></div></ModalShell>}
  </div>;
}
