import { useState, useEffect } from 'react';
import { Send, Mail, Eye, Code, Paperclip, Trash2, Download, Copy, Settings } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Tabs, Tab } from '../components/Tabs';
import { useTheme } from '../hooks/useTheme';

interface EmailAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // base64 encoded
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

interface EmailLog {
  id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: Date;
  error?: string;
  messageId?: string;
}

export function SmtpPage() {
  const { theme } = useTheme();
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    username: '',
    password: ''
  });
  
  const [email, setEmail] = useState({
    from: '',
    to: [''],
    cc: [''],
    bcc: [''],
    subject: '',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f4f4f4; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Email</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>This is a test email sent from the SMTP Tester.</p>
            <p>Best regards,<br>Your API Studio</p>
        </div>
        <div class="footer">
            <p>Sent via API Studio SMTP Tester</p>
        </div>
    </div>
</body>
</html>`,
    textContent: `Hello,

This is a test email sent from the SMTP Tester.

Best regards,
Your API Studio

---
Sent via API Studio SMTP Tester`
  });

  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [activeTab, setActiveTab] = useState('compose');
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);

  const tabs: Tab[] = [
    { id: 'compose', title: 'Compose' },
    { id: 'templates', title: 'Templates' },
    { id: 'config', title: 'SMTP Config' },
    { id: 'logs', title: `Logs (${emailLogs.length})` },
  ];

  const previewTabs: Tab[] = [
    { id: 'html', title: 'HTML Preview' },
    { id: 'text', title: 'Text Preview' },
    { id: 'code', title: 'HTML Code' },
  ];

  useEffect(() => {
    // Load saved templates
    const savedTemplates = localStorage.getItem('smtp-templates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      // Default templates
      const defaultTemplates: EmailTemplate[] = [
        {
          id: '1',
          name: 'Welcome Email',
          subject: 'Welcome to our service!',
          htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome</title>
</head>
<body>
    <h1>Welcome!</h1>
    <p>Thank you for joining our service.</p>
</body>
</html>`,
          textContent: 'Welcome!\n\nThank you for joining our service.'
        },
        {
          id: '2',
          name: 'Password Reset',
          subject: 'Reset your password',
          htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset</title>
</head>
<body>
    <h1>Password Reset</h1>
    <p>Click the link below to reset your password:</p>
    <a href="#reset-link">Reset Password</a>
</body>
</html>`,
          textContent: 'Password Reset\n\nClick the link below to reset your password:\n[Reset Password Link]'
        }
      ];
      setTemplates(defaultTemplates);
      localStorage.setItem('smtp-templates', JSON.stringify(defaultTemplates));
    }

    // Load email logs
    const savedLogs = localStorage.getItem('smtp-logs');
    if (savedLogs) {
      setEmailLogs(JSON.parse(savedLogs).map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      })));
    }
  }, []);

  const testConnection = async () => {
    setSending(true);
    try {
      // Simulate SMTP connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnected(true);
    } catch (error) {
      setConnected(false);
    } finally {
      setSending(false);
    }
  };

  const sendEmail = async () => {
    setSending(true);
    
    try {
      // Validate email addresses
      const allRecipients = [...email.to, ...email.cc, ...email.bcc].filter(Boolean);
      if (allRecipients.length === 0) {
        throw new Error('At least one recipient is required');
      }

      // Create email log entry
      const emailLog: EmailLog = {
        id: Date.now().toString(),
        to: email.to.filter(Boolean),
        cc: email.cc.filter(Boolean),
        bcc: email.bcc.filter(Boolean),
        subject: email.subject,
        status: 'pending',
        timestamp: new Date()
      };

      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success/failure
      const success = Math.random() > 0.2; // 80% success rate
      
      if (success) {
        emailLog.status = 'sent';
        emailLog.messageId = `<${Date.now()}@api-studio.local>`;
      } else {
        emailLog.status = 'failed';
        emailLog.error = 'SMTP server rejected the message';
      }

      const newLogs = [emailLog, ...emailLogs];
      setEmailLogs(newLogs);
      localStorage.setItem('smtp-logs', JSON.stringify(newLogs));

      if (success) {
        // Reset form on success
        setEmail(prev => ({
          ...prev,
          to: [''],
          cc: [''],
          bcc: [''],
          subject: '',
        }));
      }

    } catch (error) {
      const emailLog: EmailLog = {
        id: Date.now().toString(),
        to: email.to.filter(Boolean),
        cc: email.cc.filter(Boolean),
        bcc: email.bcc.filter(Boolean),
        subject: email.subject,
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      const newLogs = [emailLog, ...emailLogs];
      setEmailLogs(newLogs);
      localStorage.setItem('smtp-logs', JSON.stringify(newLogs));
    } finally {
      setSending(false);
    }
  };

  const addRecipient = (type: 'to' | 'cc' | 'bcc') => {
    setEmail(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }));
  };

  const updateRecipient = (type: 'to' | 'cc' | 'bcc', index: number, value: string) => {
    setEmail(prev => ({
      ...prev,
      [type]: prev[type].map((recipient, i) => i === index ? value : recipient)
    }));
  };

  const removeRecipient = (type: 'to' | 'cc' | 'bcc', index: number) => {
    setEmail(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: EmailAttachment = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          content: (e.target?.result as string).split(',')[1] // Remove data:type;base64, prefix
        };
        setAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const loadTemplate = (template: EmailTemplate) => {
    setEmail(prev => ({
      ...prev,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent
    }));
    setActiveTab('compose');
  };

  const saveAsTemplate = () => {
    const name = prompt('Template name:');
    if (!name) return;

    const template: EmailTemplate = {
      id: Date.now().toString(),
      name,
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent
    };

    const newTemplates = [...templates, template];
    setTemplates(newTemplates);
    localStorage.setItem('smtp-templates', JSON.stringify(newTemplates));
  };

  const deleteTemplate = (id: string) => {
    const newTemplates = templates.filter(t => t.id !== id);
    setTemplates(newTemplates);
    localStorage.setItem('smtp-templates', JSON.stringify(newTemplates));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Create theme-aware iframe content
  const getThemedIframeContent = (htmlContent: string) => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // If it's a complete HTML document, inject dark theme styles
    if (htmlContent.includes('<!DOCTYPE html>') || htmlContent.includes('<html>')) {
      if (isDark) {
        // Inject dark theme styles into the existing HTML
        const darkThemeStyles = `
          <style>
            /* Dark theme override styles */
            body { 
              background-color: #1f2937 !important; 
              color: #f9fafb !important; 
            }
            * { 
              color: #f9fafb !important; 
            }
            .header, .footer { 
              background-color: #374151 !important; 
              color: #f9fafb !important; 
            }
            h1, h2, h3, h4, h5, h6 { 
              color: #f9fafb !important; 
            }
            p { 
              color: #e5e7eb !important; 
            }
            a { 
              color: #60a5fa !important; 
            }
          </style>
        `;
        
        // Insert the dark theme styles before the closing </head> tag
        if (htmlContent.includes('</head>')) {
          return htmlContent.replace('</head>', `${darkThemeStyles}</head>`);
        } else {
          // If no head tag, wrap the content
          return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${darkThemeStyles}
</head>
<body>
  ${htmlContent}
</body>
</html>`;
        }
      }
      return htmlContent;
    } else {
      // If it's just HTML fragments, wrap it with proper document structure
      const backgroundColor = isDark ? '#1f2937' : '#ffffff';
      const textColor = isDark ? '#f9fafb' : '#000000';
      
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      background-color: ${backgroundColor}; 
      color: ${textColor}; 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      margin: 0; 
      padding: 20px; 
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
              <Mail className="w-8 h-8 text-primary-500" />
              SMTP Tester
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              connected ? 'text-green-500' : 'text-neutral-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-neutral-500'}`} />
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={testConnection} disabled={sending}>
              <Settings className="w-4 h-4 mr-2" />
              Test Connection
            </Button>
            <Button variant="primary" onClick={sendEmail} disabled={sending || !email.subject}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Email Composition */}
        <div className="w-1/2 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="flex-1 p-4 overflow-auto scrollbar-thin">
            {activeTab === 'compose' && (
              <div className="space-y-4">
                {/* Recipients */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      From
                    </label>
                    <Input
                      placeholder="sender@example.com"
                      value={email.from}
                      onChange={(e) => setEmail(prev => ({ ...prev, from: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      To
                    </label>
                    {email.to.map((recipient, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input
                          placeholder="recipient@example.com"
                          value={recipient}
                          onChange={(e) => updateRecipient('to', index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient('to', index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addRecipient('to')}>
                      Add Recipient
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      CC
                    </label>
                    {email.cc.map((recipient, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input
                          placeholder="cc@example.com"
                          value={recipient}
                          onChange={(e) => updateRecipient('cc', index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient('cc', index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addRecipient('cc')}>
                      Add CC
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      BCC
                    </label>
                    {email.bcc.map((recipient, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input
                          placeholder="bcc@example.com"
                          value={recipient}
                          onChange={(e) => updateRecipient('bcc', index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient('bcc', index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addRecipient('bcc')}>
                      Add BCC
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Subject
                    </label>
                    <Input
                      placeholder="Email subject"
                      value={email.subject}
                      onChange={(e) => setEmail(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Attachments
                    </label>
                    <div>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <Paperclip className="w-4 h-4 mr-1" />
                        Add Files
                      </Button>
                    </div>
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm text-neutral-900 dark:text-neutral-100">
                              {attachment.name}
                            </span>
                            <span className="text-xs text-neutral-500">
                              ({formatFileSize(attachment.size)})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      HTML Content
                    </label>
                    <Button variant="ghost" size="sm" onClick={saveAsTemplate}>
                      Save as Template
                    </Button>
                  </div>
                  <textarea
                    value={email.htmlContent}
                    onChange={(e) => setEmail(prev => ({ ...prev, htmlContent: e.target.value }))}
                    placeholder="HTML email content..."
                    className="w-full h-48 p-3 bg-background-light dark:bg-background-dark border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />

                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Text Content (Fallback)
                  </label>
                  <textarea
                    value={email.textContent}
                    onChange={(e) => setEmail(prev => ({ ...prev, textContent: e.target.value }))}
                    placeholder="Plain text email content..."
                    className="w-full h-32 p-3 bg-background-light dark:bg-background-dark border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Email Templates
                </h3>
                
                {templates.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                      No templates saved yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark">
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <div onClick={() => loadTemplate(template)}>
                              <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                {template.name}
                              </div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                {template.subject}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTemplate(template.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  SMTP Configuration
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      SMTP Host
                    </label>
                    <Input
                      placeholder="smtp.gmail.com"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Port
                      </label>
                      <Input
                        type="number"
                        placeholder="587"
                        value={smtpConfig.port}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={smtpConfig.secure}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, secure: e.target.checked }))}
                          className="rounded"
                        />
                        Use TLS/SSL
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Username
                    </label>
                    <Input
                      placeholder="your-email@gmail.com"
                      value={smtpConfig.username}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="your-app-password"
                      value={smtpConfig.password}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Email Logs
                </h3>
                
                {emailLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                      No emails sent yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-auto scrollbar-thin">
                    {emailLogs.map((log) => (
                      <Card key={log.id}>
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {log.subject}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded ${
                              log.status === 'sent' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {log.status}
                            </div>
                          </div>
                          <div className="text-sm text-neutral-600 dark:text-neutral-400">
                            To: {log.to.join(', ')}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                            {log.timestamp.toLocaleString()}
                            {log.messageId && ` • ${log.messageId}`}
                          </div>
                          {log.error && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Error: {log.error}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
            <Tabs tabs={previewTabs} activeTab={previewMode} onTabChange={setPreviewMode} />
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(email.htmlContent)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-auto scrollbar-thin">
            {previewMode === 'html' && (
              <div className="h-full min-h-[600px] border border-neutral-200 dark:border-neutral-800 rounded overflow-hidden bg-white dark:bg-neutral-900">
                <iframe
                  srcDoc={getThemedIframeContent(email.htmlContent)}
                  className="w-full h-full border-none"
                  title="Email Preview"
                  style={{ 
                    minHeight: '600px',
                    backgroundColor: 'transparent'
                  }}
                />
              </div>
            )}
            
            {previewMode === 'text' && (
              <pre className="whitespace-pre-wrap text-sm font-mono text-neutral-900 dark:text-neutral-100 p-4 bg-neutral-50 dark:bg-neutral-900 rounded border h-full min-h-[600px] overflow-auto scrollbar-thin">
                {email.textContent}
              </pre>
            )}
            
            {previewMode === 'code' && (
              <pre className="whitespace-pre-wrap text-sm font-mono text-neutral-900 dark:text-neutral-100 p-4 bg-neutral-50 dark:bg-neutral-900 rounded border h-full min-h-[600px] overflow-auto scrollbar-thin">
                {email.htmlContent}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}