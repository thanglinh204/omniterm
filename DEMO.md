# OmniTerm interactive demo

## Open

While the demo server is running on this machine:

http://localhost:1421/

If it is stopped, run from PowerShell:

```powershell
npm --prefix "D:\02_Project\10_OmniTerm\omniterm" run dev -- --host 127.0.0.1 --port 1421
```

Binding to loopback is intentional. On a different computer, `localhost` refers to that other computer, not this server. Do not expose Vite publicly to share this demo. A reviewed HTTPS/access-protected deployment is a separate step.

## What this build is

A React prototype for experiencing the customer/connector/session workflow. It is separate from the pilot backend in `server/` and does not call that backend. All data is fictional. IPs are from documentation ranges; emails use `example.invalid`.

No Google login, MFA, credentials, VPN, SSH, Telnet, RDP or SFTP connections are made. Account switching and frontend filtering are UX simulations, not security boundaries. A person with browser developer tools can inspect all sample data. Never enter customer secrets, real addresses, credentials, OTPs or email addresses.

All changes exist only in this page's memory. Switching accounts preserves management changes so permissions can be demonstrated, but closes existing demo tabs. Reloading resets all changes. No passwords or customer data are seeded from the previous browser-local workspace.

## Suggested walkthrough

1. Select **Admin Demo** and enter the demo. The entry button does not contact Google.
2. Browse three fictional customers, six sample resources and connector states.
3. Open `web-app-01`, acknowledge the demo warning and try `help`, `whoami`, `hostname`, `pwd`, `ls`, `uptime`, `df -h`, `date`, `clear` or `exit`.
4. Commands return fixture text, not real host output. Arbitrary commands do not execute.
5. Open multiple sample tabs and switch/close them. RDP shows a placeholder, not a remote desktop. The file pane is read-only illustrative content.
6. In **Thành viên & quyền**, edit Linh Demo. Give Harbor Lab access, then switch to Linh using the account selector. Harbor resources should appear; admin navigation should disappear.
7. Switch back to Admin Demo. Remove the Harbor grant, switch back to Linh and verify Harbor disappears.
8. Add a fictional member with an `example.invalid` email. No invitation email is sent. Lock/unlock the member; locked accounts cannot be selected.
9. In **Connector & VPN**, enable Cedar to open its Telnet demo. Acknowledge the plaintext-protocol warning. Disconnect Cedar; any associated demo sessions are closed.
10. Inspect **Nhật ký truy cập** for in-memory management/session events. Commands are not copied into this event table.
11. Read **Bảo mật** for implementation boundaries. Use **Khôi phục demo** to return to initial state.

## Verification performed

- TypeScript and Vite production build.
- Real Chromium browser scenario: enter demo, open SSH sample, run help, change Linh's customer grant, switch identity and observe the newly granted resource.
- Mobile Chromium 390×844 scenario: navigation, enable Cedar, filter Telnet, open sample, disconnect connector and observe closed session. Screenshots were inspected.
- No JavaScript page errors in these scenarios. A missing favicon request appeared in the mobile run; an SVG favicon was added afterward.
- Backend tests are independent and do not establish that this UI has real authentication or authorization.

## Next increment after UX feedback

Connect the frontend to authenticated server APIs; implement Google OIDC/BFF sessions with an explicit account allowlist; replace frontend role switching with actual authentication; implement a destination-restricted SSH gateway and customer-isolated connectors. Review credential management and host-key verification before touching real systems.
