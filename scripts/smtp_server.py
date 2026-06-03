"""
AiToEarn 本地验证码邮件接收服务
监听 1025 端口，拦截所有邮件输出到控制台
"""
import smtpd, asyncore, datetime, json, os

LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "logs", "smtp.log")
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

class DebugSMTPServer(smtpd.SMTPServer):
    def process_message(self, peer, mailfrom, rcpttos, data, **kwargs):
        msg = data.decode("utf-8", errors="replace")
        now = datetime.datetime.now().strftime("%H:%M:%S")
        
        # Extract verification code
        import re
        code_match = re.search(r'(\d{6})', msg)
        code = code_match.group(1) if code_match else "???"
        
        # Extract recipient
        to = rcpttos[0] if rcpttos else "???"
        
        line = f"[{now}] 📧 To: {to} | Code: {code}"
        print(line)
        
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")

if __name__ == "__main__":
    PORT = 1025
    print(f"📧 AiToEarn 本地邮件服务启动 (port {PORT})")
    print(f"   验证码会显示在下方，复制到页面即可登录")
    print(f"   日志: {LOG_FILE}")
    print()
    server = DebugSMTPServer(("0.0.0.0", PORT), None)
    asyncore.loop()
