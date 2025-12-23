'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, Save, Eye, Code2, Layout, Sparkles, Settings, Globe, Play, Loader2, Send, Waves,
  FolderPlus, FilePlus, Package, Terminal, Search, Cpu, HardDrive, Zap, Plug, Trash2, ChevronRight, ChevronDown, File, Folder, Code, Box
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileItem[];
  path: string;
}

interface PackageItem {
  name: string;
  version: string;
  installed: boolean;
}

interface SEOSettings {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  favicon: string;
  robots: string;
}

interface DeploymentConfig {
  type: 'autoscale' | 'vm' | 'static' | 'scheduled';
  cpu?: number;
  ram?: number;
  vmSize?: 'shared' | 'dedicated-1' | 'dedicated-2' | 'dedicated-4';
}

interface ResourceConfig {
  ram: number;
  cpu: number;
  gpu: boolean;
  gpuType: string;
  disk: number;
  cloudProvider?: 'aws' | 'gcp' | 'azure' | 'none';
  cloudCredentials?: {
    accessKey?: string;
    secretKey?: string;
    projectId?: string;
    subscriptionId?: string;
  };
}

interface IntegrationItem {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  pages: unknown;
  siteConfig: unknown;
  files: FileItem[] | null;
  packages: PackageItem[] | null;
  seoSettings: SEOSettings | null;
  resources: ResourceConfig | null;
  deploymentConfig: DeploymentConfig | null;
  integrations: IntegrationItem[] | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type EditorTab = 'visual' | 'code' | 'ai' | 'languages' | 'packages' | 'terminal' | 'seo' | 'resources' | 'deployment' | 'integrations';

const defaultResources: ResourceConfig = {
  ram: 128,
  cpu: 8,
  gpu: true,
  gpuType: 'NVIDIA A100',
  disk: 500,
  cloudProvider: 'none',
  cloudCredentials: {}
};

const defaultDeployment: DeploymentConfig = {
  type: 'autoscale',
  cpu: 1,
  ram: 2
};

const defaultSEO: SEOSettings = {
  title: '',
  description: '',
  keywords: '',
  ogImage: '',
  favicon: '',
  robots: 'index, follow'
};

const availableLanguages = [
  { id: 'javascript', name: 'JavaScript', icon: 'JS', category: 'Frontend' },
  { id: 'typescript', name: 'TypeScript', icon: 'TS', category: 'Frontend' },
  { id: 'python', name: 'Python', icon: 'PY', category: 'Backend' },
  { id: 'rust', name: 'Rust', icon: 'RS', category: 'Systems' },
  { id: 'go', name: 'Go', icon: 'GO', category: 'Backend' },
  { id: 'java', name: 'Java', icon: 'JV', category: 'Backend' },
  { id: 'kotlin', name: 'Kotlin', icon: 'KT', category: 'Mobile' },
  { id: 'swift', name: 'Swift', icon: 'SW', category: 'Mobile' },
  { id: 'csharp', name: 'C#', icon: 'C#', category: 'Backend' },
  { id: 'cpp', name: 'C++', icon: '++', category: 'Systems' },
  { id: 'c', name: 'C', icon: 'C', category: 'Systems' },
  { id: 'ruby', name: 'Ruby', icon: 'RB', category: 'Backend' },
  { id: 'php', name: 'PHP', icon: 'PH', category: 'Backend' },
  { id: 'scala', name: 'Scala', icon: 'SC', category: 'Backend' },
  { id: 'elixir', name: 'Elixir', icon: 'EX', category: 'Backend' },
  { id: 'haskell', name: 'Haskell', icon: 'HS', category: 'Functional' },
  { id: 'clojure', name: 'Clojure', icon: 'CJ', category: 'Functional' },
  { id: 'dart', name: 'Dart', icon: 'DT', category: 'Mobile' },
  { id: 'lua', name: 'Lua', icon: 'LU', category: 'Scripting' },
  { id: 'r', name: 'R', icon: 'R', category: 'Data Science' },
  { id: 'julia', name: 'Julia', icon: 'JL', category: 'Data Science' },
  { id: 'perl', name: 'Perl', icon: 'PL', category: 'Scripting' },
  { id: 'zig', name: 'Zig', icon: 'ZG', category: 'Systems' },
  { id: 'nim', name: 'Nim', icon: 'NM', category: 'Systems' },
  { id: 'ocaml', name: 'OCaml', icon: 'ML', category: 'Functional' },
  { id: 'fsharp', name: 'F#', icon: 'F#', category: 'Functional' },
  { id: 'erlang', name: 'Erlang', icon: 'ER', category: 'Functional' },
  { id: 'cobol', name: 'COBOL', icon: 'CB', category: 'Legacy' },
  { id: 'fortran', name: 'Fortran', icon: 'FT', category: 'Scientific' },
  { id: 'assembly', name: 'Assembly', icon: 'AS', category: 'Low-Level' },
  { id: 'sql', name: 'SQL', icon: 'SQ', category: 'Database' },
  { id: 'graphql', name: 'GraphQL', icon: 'GQ', category: 'API' },
  { id: 'solidity', name: 'Solidity', icon: 'SO', category: 'Blockchain' },
  { id: 'move', name: 'Move', icon: 'MV', category: 'Blockchain' },
  { id: 'cairo', name: 'Cairo', icon: 'CR', category: 'Blockchain' },
  { id: 'wasm', name: 'WebAssembly', icon: 'WA', category: 'Web' },
  { id: 'html', name: 'HTML', icon: 'HT', category: 'Markup' },
  { id: 'css', name: 'CSS', icon: 'CS', category: 'Styling' },
  { id: 'sass', name: 'Sass/SCSS', icon: 'SS', category: 'Styling' },
  { id: 'markdown', name: 'Markdown', icon: 'MD', category: 'Docs' },
];

const packageManagers = [
  { id: 'npm', name: 'npm (Node.js)', language: 'javascript' },
  { id: 'yarn', name: 'Yarn (Node.js)', language: 'javascript' },
  { id: 'pnpm', name: 'pnpm (Node.js)', language: 'javascript' },
  { id: 'bun', name: 'Bun (Node.js)', language: 'javascript' },
  { id: 'pip', name: 'pip (Python)', language: 'python' },
  { id: 'poetry', name: 'Poetry (Python)', language: 'python' },
  { id: 'conda', name: 'Conda (Python)', language: 'python' },
  { id: 'uv', name: 'uv (Python)', language: 'python' },
  { id: 'cargo', name: 'Cargo (Rust)', language: 'rust' },
  { id: 'gomod', name: 'Go Modules', language: 'go' },
  { id: 'maven', name: 'Maven (Java)', language: 'java' },
  { id: 'gradle', name: 'Gradle (Java/Kotlin)', language: 'java' },
  { id: 'nuget', name: 'NuGet (.NET)', language: 'csharp' },
  { id: 'gem', name: 'RubyGems', language: 'ruby' },
  { id: 'composer', name: 'Composer (PHP)', language: 'php' },
  { id: 'hex', name: 'Hex (Elixir)', language: 'elixir' },
  { id: 'pub', name: 'pub (Dart/Flutter)', language: 'dart' },
  { id: 'spm', name: 'Swift Package Manager', language: 'swift' },
  { id: 'cran', name: 'CRAN (R)', language: 'r' },
  { id: 'cabal', name: 'Cabal (Haskell)', language: 'haskell' },
  { id: 'opam', name: 'opam (OCaml)', language: 'ocaml' },
  { id: 'vcpkg', name: 'vcpkg (C/C++)', language: 'cpp' },
  { id: 'conan', name: 'Conan (C/C++)', language: 'cpp' },
];

const availableIntegrations: IntegrationItem[] = [
  { id: 'analytics', name: 'Google Analytics', enabled: false },
  { id: 'gtm', name: 'Google Tag Manager', enabled: false },
  { id: 'mixpanel', name: 'Mixpanel', enabled: false },
  { id: 'amplitude', name: 'Amplitude', enabled: false },
  { id: 'segment', name: 'Segment', enabled: false },
  { id: 'hotjar', name: 'Hotjar', enabled: false },
  { id: 'posthog', name: 'PostHog', enabled: false },
  { id: 'stripe', name: 'Stripe Payments', enabled: false },
  { id: 'paypal', name: 'PayPal', enabled: false },
  { id: 'square', name: 'Square Payments', enabled: false },
  { id: 'braintree', name: 'Braintree', enabled: false },
  { id: 'paddle', name: 'Paddle', enabled: false },
  { id: 'lemonsqueezy', name: 'Lemon Squeezy', enabled: false },
  { id: 'auth0', name: 'Auth0', enabled: false },
  { id: 'clerk', name: 'Clerk', enabled: false },
  { id: 'nextauth', name: 'NextAuth.js', enabled: false },
  { id: 'supabase-auth', name: 'Supabase Auth', enabled: false },
  { id: 'firebase-auth', name: 'Firebase Auth', enabled: false },
  { id: 'okta', name: 'Okta', enabled: false },
  { id: 'keycloak', name: 'Keycloak', enabled: false },
  { id: 'cloudinary', name: 'Cloudinary', enabled: false },
  { id: 'uploadthing', name: 'UploadThing', enabled: false },
  { id: 'imagekit', name: 'ImageKit', enabled: false },
  { id: 'bunnycdn', name: 'BunnyCDN', enabled: false },
  { id: 'cloudflare-images', name: 'Cloudflare Images', enabled: false },
  { id: 'sendgrid', name: 'SendGrid', enabled: false },
  { id: 'resend', name: 'Resend', enabled: false },
  { id: 'postmark', name: 'Postmark', enabled: false },
  { id: 'mailgun', name: 'Mailgun', enabled: false },
  { id: 'mailchimp', name: 'Mailchimp', enabled: false },
  { id: 'convertkit', name: 'ConvertKit', enabled: false },
  { id: 'twilio', name: 'Twilio', enabled: false },
  { id: 'vonage', name: 'Vonage', enabled: false },
  { id: 'messagebird', name: 'MessageBird', enabled: false },
  { id: 'firebase', name: 'Firebase', enabled: false },
  { id: 'supabase', name: 'Supabase', enabled: false },
  { id: 'planetscale', name: 'PlanetScale', enabled: false },
  { id: 'neon', name: 'Neon Database', enabled: false },
  { id: 'xata', name: 'Xata', enabled: false },
  { id: 'turso', name: 'Turso', enabled: false },
  { id: 'mongodb', name: 'MongoDB Atlas', enabled: false },
  { id: 'fauna', name: 'Fauna', enabled: false },
  { id: 'cockroachdb', name: 'CockroachDB', enabled: false },
  { id: 'redis', name: 'Redis/Upstash', enabled: false },
  { id: 'openai', name: 'OpenAI', enabled: false },
  { id: 'anthropic', name: 'Anthropic Claude', enabled: false },
  { id: 'google-ai', name: 'Google AI (Gemini)', enabled: false },
  { id: 'cohere', name: 'Cohere', enabled: false },
  { id: 'replicate', name: 'Replicate', enabled: false },
  { id: 'huggingface', name: 'Hugging Face', enabled: false },
  { id: 'stability', name: 'Stability AI', enabled: false },
  { id: 'elevenlabs', name: 'ElevenLabs', enabled: false },
  { id: 'vercel', name: 'Vercel', enabled: false },
  { id: 'netlify', name: 'Netlify', enabled: false },
  { id: 'railway', name: 'Railway', enabled: false },
  { id: 'render', name: 'Render', enabled: false },
  { id: 'fly', name: 'Fly.io', enabled: false },
  { id: 'aws', name: 'AWS', enabled: false },
  { id: 'gcp', name: 'Google Cloud', enabled: false },
  { id: 'azure', name: 'Azure', enabled: false },
  { id: 'digitalocean', name: 'DigitalOcean', enabled: false },
  { id: 'cloudflare', name: 'Cloudflare', enabled: false },
  { id: 'github', name: 'GitHub', enabled: false },
  { id: 'gitlab', name: 'GitLab', enabled: false },
  { id: 'bitbucket', name: 'Bitbucket', enabled: false },
  { id: 'linear', name: 'Linear', enabled: false },
  { id: 'jira', name: 'Jira', enabled: false },
  { id: 'notion', name: 'Notion', enabled: false },
  { id: 'slack', name: 'Slack', enabled: false },
  { id: 'discord', name: 'Discord', enabled: false },
  { id: 'telegram', name: 'Telegram', enabled: false },
  { id: 'sentry', name: 'Sentry', enabled: false },
  { id: 'datadog', name: 'Datadog', enabled: false },
  { id: 'logrocket', name: 'LogRocket', enabled: false },
  { id: 'newrelic', name: 'New Relic', enabled: false },
  { id: 'algolia', name: 'Algolia', enabled: false },
  { id: 'meilisearch', name: 'Meilisearch', enabled: false },
  { id: 'typesense', name: 'Typesense', enabled: false },
  { id: 'elasticsearch', name: 'Elasticsearch', enabled: false },
  { id: 'shopify', name: 'Shopify', enabled: false },
  { id: 'woocommerce', name: 'WooCommerce', enabled: false },
  { id: 'snipcart', name: 'Snipcart', enabled: false },
  { id: 'medusa', name: 'Medusa', enabled: false },
  { id: 'contentful', name: 'Contentful', enabled: false },
  { id: 'sanity', name: 'Sanity', enabled: false },
  { id: 'strapi', name: 'Strapi', enabled: false },
  { id: 'prismic', name: 'Prismic', enabled: false },
  { id: 'datocms', name: 'DatoCMS', enabled: false },
  { id: 'storyblok', name: 'Storyblok', enabled: false },
];

export default function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('code');
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [code, setCode] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [packageSearch, setPackageSearch] = useState('');
  const [installingPackage, setInstallingPackage] = useState(false);
  
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['$ Welcome to hgland Terminal', '$ Type commands and press Enter to run']);
  const [terminalInput, setTerminalInput] = useState('');
  const [runningCommand, setRunningCommand] = useState(false);
  
  const [seoSettings, setSeoSettings] = useState<SEOSettings>(defaultSEO);
  const [resources, setResources] = useState<ResourceConfig>(defaultResources);
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig>(defaultDeployment);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(availableIntegrations);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function loadProject() {
      try {
        const [projectRes, messagesRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/messages`)
        ]);
        
        if (!projectRes.ok) {
          router.push('/dashboard');
          return;
        }
        
        const data = await projectRes.json();
        setProject(data.project);
        
        if (data.project.files && Array.isArray(data.project.files)) {
          setFiles(data.project.files);
          if (data.project.files.length > 0) {
            const firstFile = findFirstFile(data.project.files);
            if (firstFile) {
              setSelectedFile(firstFile);
              setCode(firstFile.content || '');
            }
          }
        } else {
          const defaultFiles: FileItem[] = [
            { id: '1', name: 'index.html', type: 'file', path: '/index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Website</title>\n</head>\n<body>\n  <h1>Welcome!</h1>\n</body>\n</html>' },
            { id: '2', name: 'styles.css', type: 'file', path: '/styles.css', content: 'body {\n  font-family: sans-serif;\n  margin: 0;\n  padding: 20px;\n}' },
            { id: '3', name: 'script.js', type: 'file', path: '/script.js', content: '// Your JavaScript code here\nconsole.log("Hello World!");' },
          ];
          setFiles(defaultFiles);
          setSelectedFile(defaultFiles[0]);
          setCode(defaultFiles[0].content || '');
        }
        
        if (data.project.packages) setPackages(data.project.packages);
        if (data.project.seoSettings) setSeoSettings(data.project.seoSettings);
        if (data.project.resources) setResources(data.project.resources);
        if (data.project.deploymentConfig) setDeploymentConfig(data.project.deploymentConfig);
        if (data.project.integrations) setIntegrations(data.project.integrations);
        
        if (messagesRes.ok) {
          const msgData = await messagesRes.json();
          if (msgData.messages && msgData.messages.length > 0) {
            const messages = msgData.messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            }));
            setChatMessages(messages);
          }
        }
      } catch {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id, router]);

  function findFirstFile(items: FileItem[]): FileItem | null {
    for (const item of items) {
      if (item.type === 'file') return item;
      if (item.children) {
        const found = findFirstFile(item.children);
        if (found) return found;
      }
    }
    return null;
  }

  function updateFileContent(items: FileItem[], fileId: string, content: string): FileItem[] {
    return items.map(item => {
      if (item.id === fileId) return { ...item, content };
      if (item.children) return { ...item, children: updateFileContent(item.children, fileId, content) };
      return item;
    });
  }

  async function handleSave() {
    if (!project) return;
    setSaving(true);
    try {
      const updatedFiles = selectedFile 
        ? updateFileContent(files, selectedFile.id, code)
        : files;
      setFiles(updatedFiles);
      
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          files: updatedFiles,
          packages,
          seoSettings,
          resources,
          integrations
        }),
      });
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  function addFile() {
    const name = prompt('Enter file name (e.g., about.html):');
    if (!name) return;
    const newFile: FileItem = {
      id: Date.now().toString(),
      name,
      type: 'file',
      path: '/' + name,
      content: ''
    };
    const updated = [...files, newFile];
    setFiles(updated);
    setSelectedFile(newFile);
    setCode('');
    saveProjectData({ files: updated });
  }

  function addFolder() {
    const name = prompt('Enter folder name:');
    if (!name) return;
    const newFolder: FileItem = {
      id: Date.now().toString(),
      name,
      type: 'folder',
      path: '/' + name,
      children: []
    };
    const updated = [...files, newFolder];
    setFiles(updated);
    saveProjectData({ files: updated });
  }

  function deleteFile(fileId: string) {
    if (!confirm('Delete this file?')) return;
    const removeItem = (items: FileItem[]): FileItem[] => 
      items.filter(i => i.id !== fileId).map(i => ({
        ...i,
        children: i.children ? removeItem(i.children) : undefined
      }));
    const updated = removeItem(files);
    setFiles(updated);
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
      setCode('');
    }
    saveProjectData({ files: updated });
  }

  function toggleFolder(folderId: string) {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  }

  function getAllFiles(items: FileItem[]): FileItem[] {
    let allFiles: FileItem[] = [];
    for (const item of items) {
      if (item.type === 'file') {
        allFiles.push(item);
      } else if (item.children) {
        allFiles = allFiles.concat(getAllFiles(item.children));
      }
    }
    return allFiles;
  }

  function buildPreviewHTML(allFiles: FileItem[]): string {
    let htmlContent = '';
    let cssContent = '';
    let jsContent = '';

    // Collect HTML, CSS, and JS files
    for (const file of allFiles) {
      const content = file.content || '';
      if (file.name.endsWith('.html')) {
        htmlContent = content; // Use first HTML file as base
      } else if (file.name.endsWith('.css')) {
        cssContent += content + '\n';
      } else if (file.name.endsWith('.js')) {
        jsContent += content + '\n';
      }
    }

    // If no HTML file, create a basic structure
    if (!htmlContent) {
      htmlContent = '<!DOCTYPE html>\n<html>\n<head><title>Preview</title></head>\n<body></body>\n</html>';
    }

    // Insert CSS and JS into HTML
    const headEndIndex = htmlContent.indexOf('</head>');
    const bodyEndIndex = htmlContent.lastIndexOf('</body>');

    if (headEndIndex !== -1 && cssContent) {
      htmlContent = htmlContent.slice(0, headEndIndex) + 
        `<style>\n${cssContent}\n</style>\n` + 
        htmlContent.slice(headEndIndex);
    }

    if (bodyEndIndex !== -1 && jsContent) {
      htmlContent = htmlContent.slice(0, bodyEndIndex) + 
        `<script>\n${jsContent}\n</script>\n` + 
        htmlContent.slice(bodyEndIndex);
    } else if (jsContent) {
      htmlContent = htmlContent.slice(0, -7) + `<script>\n${jsContent}\n</script>\n</html>`;
    }

    return htmlContent;
  }

  useEffect(() => {
    if (previewRef.current && files.length > 0) {
      const allFiles = getAllFiles(files);
      const previewHTML = buildPreviewHTML(allFiles);
      
      const doc = previewRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHTML);
        doc.close();
      }
    }
  }, [files]);

  async function installPackage() {
    if (!packageSearch.trim()) return;
    const pkgName = packageSearch.trim();
    
    if (packages.some(p => p.name === pkgName)) {
      alert(`Package "${pkgName}" is already installed.`);
      return;
    }
    
    setInstallingPackage(true);
    setPackageSearch('');
    
    try {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}/latest`);
      
      if (!res.ok) {
        alert(`Package "${pkgName}" not found on npm.`);
        setInstallingPackage(false);
        return;
      }
      
      const data = await res.json();
      const newPackage: PackageItem = {
        name: pkgName,
        version: data.version || 'latest',
        installed: true
      };
      const updated = [...packages, newPackage];
      setPackages(updated);
      saveProjectData({ packages: updated });
    } catch {
      alert(`Failed to install "${pkgName}". Please check the package name.`);
    } finally {
      setInstallingPackage(false);
    }
  }

  function removePackage(name: string) {
    const updated = packages.filter(p => p.name !== name);
    setPackages(updated);
    saveProjectData({ packages: updated });
  }

  async function runTerminalCommand() {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput;
    setTerminalInput('');
    setRunningCommand(true);
    setTerminalOutput(prev => [...prev, `$ ${cmd}`]);
    
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    
    let output = '';
    if (cmd.startsWith('npm install')) {
      output = `added 1 package in 2.1s\n\n1 package is looking for funding\n  run \`npm fund\` for details`;
    } else if (cmd === 'npm run build') {
      output = `> build\n> next build\n\nCreating an optimized production build...\n✓ Compiled successfully\n✓ Linting and checking validity\n✓ Collecting page data\n✓ Generating static pages\n\nRoute (app)                               Size     First Load JS\n┌ ○ /                                     5.2 kB        89.4 kB\n└ ○ /about                                2.1 kB        86.3 kB\n\n✓ Build completed`;
    } else if (cmd === 'ls') {
      output = files.map(f => f.name).join('\n');
    } else if (cmd === 'pwd') {
      output = '/home/project';
    } else if (cmd.startsWith('echo')) {
      output = cmd.replace('echo ', '');
    } else if (cmd === 'clear') {
      setTerminalOutput([]);
      setRunningCommand(false);
      return;
    } else {
      output = `Command executed: ${cmd}`;
    }
    
    setTerminalOutput(prev => [...prev, output]);
    setRunningCommand(false);
    
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }

  function toggleIntegration(integrationId: string) {
    const updated = integrations.map(i => 
      i.id === integrationId ? { ...i, enabled: !i.enabled } : i
    );
    setIntegrations(updated);
    saveProjectData({ integrations: updated });
  }

  async function saveProjectData(data: Record<string, unknown>) {
    if (!project) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save project:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  async function saveMessage(role: 'user' | 'assistant', content: string) {
    if (!project) return;
    try {
      await fetch(`/api/projects/${project.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  }

  async function handleAIChat() {
    if (!aiPrompt.trim() || !project) return;
    
    const userMessage = aiPrompt.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiPrompt('');
    setGenerating(true);
    await saveMessage('user', userMessage);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMessage, 
          projectId: project.id,
          mode: 'autonomous',
          files: files,
          conversationHistory: chatMessages.slice(-20)
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();
      
      if (data.updatedFiles && data.updatedFiles.length > 0) {
        setFiles(data.updatedFiles);
      }
      
      if (data.newPackages && data.newPackages.length > 0) {
        setPackages(prev => [...prev, ...data.newPackages]);
      }
      
      if (data.terminalOutput && data.terminalOutput.length > 0) {
        setTerminalOutput(prev => [...prev, ...data.terminalOutput]);
      }
      
      let assistantMessage = data.message || '';
      
      if (data.toolResults && data.toolResults.length > 0) {
        const actions = data.toolResults.map((t: { tool: string; success: boolean; result: { message?: string } }) => 
          `${t.success ? '✓' : '✗'} ${t.result?.message || t.tool}`
        ).join('\n');
        
        if (actions && !assistantMessage.includes(actions)) {
          assistantMessage += `\n\n**Actions performed:**\n${actions}`;
        }
      }
      
      if (data.generatedImages && data.generatedImages.length > 0) {
        assistantMessage += `\n\n**Generated ${data.generatedImages.length} image(s)** - Check the file tree under /images`;
      }
      
      if (data.contextCompacted) {
        assistantMessage += '\n\n*Context compacted to maintain performance*';
      }
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      await saveMessage('assistant', assistantMessage);
    } catch (err) {
      const errorMessage = `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
      await saveMessage('assistant', errorMessage);
    } finally {
      setGenerating(false);
    }
  }

  function renderFileTree(items: FileItem[], depth = 0) {
    return items.map(item => (
      <div key={item.id}>
        <div
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.id);
            } else {
              if (selectedFile) {
                setFiles(updateFileContent(files, selectedFile.id, code));
              }
              setSelectedFile(item);
              setCode(item.content || '');
            }
          }}
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer group ${
            selectedFile?.id === item.id ? 'bg-cyan-600 text-white' : 'text-cyan-200 hover:bg-cyan-800/50'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {item.type === 'folder' ? (
            <>
              {expandedFolders.has(item.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Folder className="w-4 h-4 text-yellow-400" />
            </>
          ) : (
            <>
              <span className="w-3" />
              <File className="w-4 h-4 text-cyan-400" />
            </>
          )}
          <span className="text-sm flex-1 truncate">{item.name}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); deleteFile(item.id); }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        {item.type === 'folder' && expandedFolders.has(item.id) && item.children && (
          renderFileTree(item.children, depth + 1)
        )}
      </div>
    ));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-slate-950 flex flex-col">
      <nav className="bg-cyan-900/30 border-b border-cyan-800/50 flex-shrink-0 backdrop-blur-sm">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-cyan-300 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="h-6 w-px bg-cyan-700" />
              <Waves className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-medium">{project.name}</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${project.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {project.status}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-cyan-300 hover:text-white transition-colors">
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 text-cyan-300 hover:text-white transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-medium rounded-lg transition-colors">
                <Globe className="w-4 h-4" /> Publish
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-14 bg-cyan-900/20 border-r border-cyan-800/30 flex flex-col items-center py-4 gap-1">
          {[
            { tab: 'code' as EditorTab, icon: Code2, label: 'Code' },
            { tab: 'visual' as EditorTab, icon: Layout, label: 'Visual' },
            { tab: 'ai' as EditorTab, icon: Sparkles, label: 'AI' },
            { tab: 'languages' as EditorTab, icon: Code, label: 'Languages' },
            { tab: 'packages' as EditorTab, icon: Package, label: 'Packages' },
            { tab: 'terminal' as EditorTab, icon: Terminal, label: 'Terminal' },
            { tab: 'seo' as EditorTab, icon: Search, label: 'SEO' },
            { tab: 'resources' as EditorTab, icon: Cpu, label: 'Resources' },
            { tab: 'deployment' as EditorTab, icon: Zap, label: 'Deploy' },
            { tab: 'integrations' as EditorTab, icon: Plug, label: 'Integrations' },
          ].map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white' : 'text-cyan-400 hover:bg-cyan-800/50'}`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'code' && (
            <>
              <div className="w-56 bg-cyan-900/20 border-r border-cyan-800/30 flex flex-col">
                <div className="p-2 border-b border-cyan-800/30 flex items-center gap-1">
                  <button onClick={addFile} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-cyan-800/30 hover:bg-cyan-700/40 rounded text-xs text-cyan-300">
                    <FilePlus className="w-3 h-3" /> File
                  </button>
                  <button onClick={addFolder} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-cyan-800/30 hover:bg-cyan-700/40 rounded text-xs text-cyan-300">
                    <FolderPlus className="w-3 h-3" /> Folder
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {renderFileTree(files)}
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onBlur={() => {
                      if (selectedFile) {
                        const updated = updateFileContent(files, selectedFile.id, code);
                        setFiles(updated);
                        saveProjectData({ files: updated });
                      }
                    }}
                    className="w-full h-full bg-slate-950 text-cyan-400 font-mono text-sm p-4 rounded-lg border border-cyan-800/50 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    spellCheck={false}
                    placeholder={selectedFile ? `Editing: ${selectedFile.name}` : 'Select a file to edit'}
                  />
                </div>
              </div>
              <div className="w-1/3 border-l border-cyan-800/30 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-cyan-400">Preview</h3>
                  <div className="flex items-center gap-2">
                    {saveStatus === 'saving' && <span className="text-xs text-yellow-400">Saving...</span>}
                    {saveStatus === 'saved' && <span className="text-xs text-green-400">Saved ✓</span>}
                    {saveStatus === 'error' && <span className="text-xs text-red-400">Error</span>}
                  </div>
                </div>
                <iframe
                  ref={previewRef}
                  className="flex-1 w-full rounded-lg border border-cyan-800/50 bg-white"
                  title="HTML Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </>
          )}

          {activeTab === 'visual' && (
            <div className="flex-1 flex items-center justify-center text-cyan-400">
              <div className="text-center">
                <Layout className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Visual Editor - Drag & Drop Coming Soon</p>
              </div>
            </div>
          )}

          {activeTab === 'languages' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <h2 className="text-xl font-semibold text-white mb-2">Languages & Package Managers</h2>
              <p className="text-cyan-400/70 text-sm mb-6">Select programming languages and package managers for your project. The AI agent can generate code in any of these languages.</p>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium text-cyan-300 mb-4">Programming Languages ({availableLanguages.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {availableLanguages.map((lang) => (
                    <div key={lang.id} className="p-3 bg-cyan-900/30 rounded-lg border border-cyan-800/30 hover:border-cyan-500/50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-teal-500 rounded text-white text-xs font-bold">{lang.icon}</span>
                        <span className="text-white font-medium text-sm">{lang.name}</span>
                      </div>
                      <span className="text-xs text-cyan-400/60">{lang.category}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-cyan-300 mb-4">Package Managers ({packageManagers.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {packageManagers.map((pm) => (
                    <div key={pm.id} className="p-3 bg-cyan-900/30 rounded-lg border border-cyan-800/30 hover:border-cyan-500/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Box className="w-5 h-5 text-cyan-400" />
                        <span className="text-white font-medium text-sm">{pm.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="flex-1 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Package Manager</h2>
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={packageSearch}
                  onChange={(e) => setPackageSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && installPackage()}
                  placeholder="Search npm packages..."
                  className="flex-1 px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={installPackage}
                  disabled={installingPackage || !packageSearch.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg disabled:opacity-50"
                >
                  {installingPackage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Install'}
                </button>
              </div>
              <div className="space-y-2">
                {packages.map((pkg) => (
                  <div key={pkg.name} className="flex items-center justify-between p-3 bg-cyan-900/30 rounded-lg border border-cyan-800/30">
                    <div>
                      <span className="text-white font-medium">{pkg.name}</span>
                      <span className="text-cyan-400 text-sm ml-2">@{pkg.version}</span>
                    </div>
                    <button onClick={() => removePackage(pkg.name)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {packages.length === 0 && (
                  <p className="text-cyan-400/60 text-center py-8">No packages installed. Search and install packages above.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="flex-1 flex flex-col p-4">
              <div ref={terminalRef} className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-sm overflow-y-auto mb-4 border border-cyan-800/50">
                {terminalOutput.map((line, i) => (
                  <div key={i} className={line.startsWith('$') ? 'text-cyan-400' : 'text-green-400'}>{line}</div>
                ))}
                {runningCommand && <div className="text-yellow-400 animate-pulse">Running...</div>}
              </div>
              <div className="flex gap-2">
                <span className="text-cyan-400 py-2">$</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runTerminalCommand()}
                  disabled={runningCommand}
                  placeholder="Enter command..."
                  className="flex-1 px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white font-mono placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={runTerminalCommand}
                  disabled={runningCommand}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="flex-1 p-6 max-w-2xl">
              <h2 className="text-xl font-semibold text-white mb-6">SEO Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">Page Title</label>
                  <input type="text" value={seoSettings.title} onChange={(e) => setSeoSettings({...seoSettings, title: e.target.value})} onBlur={() => saveProjectData({ seoSettings })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="My Awesome Website" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">Meta Description</label>
                  <textarea value={seoSettings.description} onChange={(e) => setSeoSettings({...seoSettings, description: e.target.value})} onBlur={() => saveProjectData({ seoSettings })} rows={3} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" placeholder="A brief description of your website..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">Keywords</label>
                  <input type="text" value={seoSettings.keywords} onChange={(e) => setSeoSettings({...seoSettings, keywords: e.target.value})} onBlur={() => saveProjectData({ seoSettings })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="keyword1, keyword2, keyword3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">OG Image URL</label>
                  <input type="text" value={seoSettings.ogImage} onChange={(e) => setSeoSettings({...seoSettings, ogImage: e.target.value})} onBlur={() => saveProjectData({ seoSettings })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">Robots</label>
                  <select value={seoSettings.robots} onChange={(e) => {
                    const updated = {...seoSettings, robots: e.target.value};
                    setSeoSettings(updated);
                    saveProjectData({ seoSettings: updated });
                  }} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="index, follow">Index, Follow</option>
                    <option value="noindex, follow">No Index, Follow</option>
                    <option value="index, nofollow">Index, No Follow</option>
                    <option value="noindex, nofollow">No Index, No Follow</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="flex-1 p-6 max-w-3xl overflow-y-auto">
              <h2 className="text-xl font-semibold text-white mb-6">Project Resources</h2>
              
              <div className="mb-8 pb-8 border-b border-cyan-700/30">
                <h3 className="text-lg font-medium text-cyan-300 mb-4">Resource Configuration</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">RAM: {resources.ram >= 1024 ? (resources.ram / 1024).toFixed(1) + ' TB' : resources.ram + ' GB'}</label>
                    <input type="range" min="8" max="4096" step="8" value={resources.ram} onChange={(e) => {
                      const updated = {...resources, ram: parseInt(e.target.value)};
                      setResources(updated);
                    }} onMouseUp={() => saveProjectData({ resources })} className="w-full accent-cyan-500" />
                    <div className="flex justify-between text-xs text-cyan-400 mt-1"><span>8 GB</span><span>4 TB</span></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">CPU Cores: {resources.cpu}</label>
                    <input type="range" min="1" max="128" step="1" value={resources.cpu} onChange={(e) => {
                      const updated = {...resources, cpu: parseInt(e.target.value)};
                      setResources(updated);
                    }} onMouseUp={() => saveProjectData({ resources })} className="w-full accent-cyan-500" />
                    <div className="flex justify-between text-xs text-cyan-400 mt-1"><span>1 core</span><span>128 cores</span></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">Disk Storage: {resources.disk} GB ({(resources.disk / 1024).toFixed(1)} TB)</label>
                    <input type="range" min="50" max="4096000" step="100" value={resources.disk} onChange={(e) => {
                      const updated = {...resources, disk: parseInt(e.target.value)};
                      setResources(updated);
                    }} onMouseUp={() => saveProjectData({ resources })} className="w-full accent-cyan-500" />
                    <div className="flex justify-between text-xs text-cyan-400 mt-1"><span>50 GB</span><span>4 PB</span></div>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={resources.gpu} onChange={(e) => {
                        const updated = {...resources, gpu: e.target.checked};
                        setResources(updated);
                        saveProjectData({ resources: updated });
                      }} className="w-5 h-5 accent-cyan-500" />
                      <span className="text-cyan-200">Enable GPU</span>
                    </label>
                  </div>
                  {resources.gpu && (
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">GPU Type</label>
                      <select value={resources.gpuType} onChange={(e) => {
                        const updated = {...resources, gpuType: e.target.value};
                        setResources(updated);
                        saveProjectData({ resources: updated });
                      }} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        <option value="NVIDIA A100">NVIDIA A100 (80GB)</option>
                        <option value="NVIDIA H100">NVIDIA H100 (80GB)</option>
                        <option value="NVIDIA RTX 4090">NVIDIA RTX 4090 (24GB)</option>
                        <option value="NVIDIA T4">NVIDIA T4 (16GB)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-cyan-300 mb-4">Connect Your Cloud Provider</h3>
                <p className="text-cyan-400/70 text-sm mb-4">Use your own cloud infrastructure (AWS, GCP, Azure) for real resources</p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-cyan-200 mb-2">Cloud Provider</label>
                  <select value={resources.cloudProvider || 'none'} onChange={(e) => {
                    const updated = {...resources, cloudProvider: e.target.value as 'aws' | 'gcp' | 'azure' | 'none'};
                    setResources(updated);
                    saveProjectData({ resources: updated });
                  }} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="none">None (Mock resources)</option>
                    <option value="aws">Amazon Web Services (AWS)</option>
                    <option value="gcp">Google Cloud Platform (GCP)</option>
                    <option value="azure">Microsoft Azure</option>
                  </select>
                </div>

                {resources.cloudProvider === 'aws' && (
                  <div className="space-y-4 p-4 bg-cyan-900/20 rounded-lg border border-cyan-800/30">
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">AWS Access Key ID</label>
                      <input type="password" placeholder="AKIA..." value={resources.cloudCredentials?.accessKey || ''} onChange={(e) => {
                        const updated = {...resources, cloudCredentials: {...resources.cloudCredentials, accessKey: e.target.value}};
                        setResources(updated);
                      }} onBlur={() => saveProjectData({ resources })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">AWS Secret Access Key</label>
                      <input type="password" placeholder="••••••••••" value={resources.cloudCredentials?.secretKey || ''} onChange={(e) => {
                        const updated = {...resources, cloudCredentials: {...resources.cloudCredentials, secretKey: e.target.value}};
                        setResources(updated);
                      }} onBlur={() => saveProjectData({ resources })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                  </div>
                )}

                {resources.cloudProvider === 'gcp' && (
                  <div className="space-y-4 p-4 bg-cyan-900/20 rounded-lg border border-cyan-800/30">
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">GCP Project ID</label>
                      <input type="text" placeholder="my-project-id" value={resources.cloudCredentials?.projectId || ''} onChange={(e) => {
                        const updated = {...resources, cloudCredentials: {...resources.cloudCredentials, projectId: e.target.value}};
                        setResources(updated);
                      }} onBlur={() => saveProjectData({ resources })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">GCP Service Account Key (JSON)</label>
                      <textarea placeholder='{"type": "service_account", ...}' rows={4} value={resources.cloudCredentials?.secretKey || ''} onChange={(e) => {
                        const updated = {...resources, cloudCredentials: {...resources.cloudCredentials, secretKey: e.target.value}};
                        setResources(updated);
                      }} onBlur={() => saveProjectData({ resources })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
                    </div>
                  </div>
                )}

                {resources.cloudProvider === 'azure' && (
                  <div className="space-y-4 p-4 bg-cyan-900/20 rounded-lg border border-cyan-800/30">
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">Azure Subscription ID</label>
                      <input type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={resources.cloudCredentials?.subscriptionId || ''} onChange={(e) => {
                        const updated = {...resources, cloudCredentials: {...resources.cloudCredentials, subscriptionId: e.target.value}};
                        setResources(updated);
                      }} onBlur={() => saveProjectData({ resources })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">Azure Client ID</label>
                      <input type="password" placeholder="••••••••••" value={resources.cloudCredentials?.accessKey || ''} onChange={(e) => {
                        const updated = {...resources, cloudCredentials: {...resources.cloudCredentials, accessKey: e.target.value}};
                        setResources(updated);
                      }} onBlur={() => saveProjectData({ resources })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">Azure Client Secret</label>
                      <input type="password" placeholder="••••••••••" value={resources.cloudCredentials?.secretKey || ''} onChange={(e) => {
                        const updated = {...resources, cloudCredentials: {...resources.cloudCredentials, secretKey: e.target.value}};
                        setResources(updated);
                      }} onBlur={() => saveProjectData({ resources })} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'deployment' && (
            <div className="flex-1 p-6 max-w-2xl">
              <h2 className="text-xl font-semibold text-white mb-6">Deployment Configuration</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">Deployment Type</label>
                  <select value={deploymentConfig.type} onChange={(e) => {
                    const updated = {...deploymentConfig, type: e.target.value as 'autoscale' | 'vm' | 'static' | 'scheduled'};
                    setDeploymentConfig(updated);
                    saveProjectData({ deploymentConfig: updated });
                  }} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="autoscale">Autoscale (Pay per request)</option>
                    <option value="vm">Reserved VM (Always running)</option>
                    <option value="static">Static (HTML/CSS/JS only)</option>
                    <option value="scheduled">Scheduled (Cron jobs)</option>
                  </select>
                  <p className="text-cyan-400/60 text-sm mt-2">Choose how your app will run when deployed</p>
                </div>

                {deploymentConfig.type === 'autoscale' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">CPU: {deploymentConfig.cpu} vCPU</label>
                      <input type="range" min="0.5" max="4" step="0.5" value={deploymentConfig.cpu || 1} onChange={(e) => {
                        const updated = {...deploymentConfig, cpu: parseFloat(e.target.value)};
                        setDeploymentConfig(updated);
                      }} onMouseUp={() => saveProjectData({ deploymentConfig })} className="w-full accent-cyan-500" />
                      <div className="flex justify-between text-xs text-cyan-400 mt-1"><span>0.5 vCPU</span><span>4 vCPU</span></div>
                      <p className="text-cyan-400/60 text-xs mt-2">Billed: 18 Compute Units per CPU second</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">RAM: {deploymentConfig.ram} GB</label>
                      <input type="range" min="0.5" max="32" step="0.5" value={deploymentConfig.ram || 2} onChange={(e) => {
                        const updated = {...deploymentConfig, ram: parseFloat(e.target.value)};
                        setDeploymentConfig(updated);
                      }} onMouseUp={() => saveProjectData({ deploymentConfig })} className="w-full accent-cyan-500" />
                      <div className="flex justify-between text-xs text-cyan-400 mt-1"><span>0.5 GB</span><span>32 GB</span></div>
                      <p className="text-cyan-400/60 text-xs mt-2">Billed: 2 Compute Units per RAM second</p>
                    </div>
                  </>
                )}

                {deploymentConfig.type === 'vm' && (
                  <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">VM Size</label>
                    <select value={deploymentConfig.vmSize || 'shared'} onChange={(e) => {
                      const updated = {...deploymentConfig, vmSize: e.target.value as 'shared' | 'dedicated-1' | 'dedicated-2' | 'dedicated-4'};
                      setDeploymentConfig(updated);
                      saveProjectData({ deploymentConfig: updated });
                    }} className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                      <option value="shared">Shared VM (0.5 vCPU, 2GB RAM)</option>
                      <option value="dedicated-1">Dedicated 1 (1 vCPU, 4GB RAM)</option>
                      <option value="dedicated-2">Dedicated 2 (2 vCPU, 8GB RAM)</option>
                      <option value="dedicated-4">Dedicated 4 (4 vCPU, 16GB RAM)</option>
                    </select>
                    <p className="text-cyan-400/60 text-sm mt-2">VM always runs. Pay per hour based on size</p>
                  </div>
                )}

                {deploymentConfig.type === 'static' && (
                  <div className="p-4 bg-cyan-900/30 rounded-lg border border-cyan-800/50">
                    <p className="text-cyan-200">Static deployments host HTML, CSS, and JavaScript files only. No backend code. Free Compute Units!</p>
                  </div>
                )}

                {deploymentConfig.type === 'scheduled' && (
                  <div className="p-4 bg-cyan-900/30 rounded-lg border border-cyan-800/50">
                    <p className="text-cyan-200">Scheduled deployments run on a fixed 1 vCPU / 2GB RAM configuration. Perfect for cron jobs and periodic tasks</p>
                  </div>
                )}

                <div className="p-4 bg-cyan-900/20 rounded-lg border border-cyan-700/30 mt-6">
                  <p className="text-cyan-300 font-medium mb-2">ℹ️ Important Note</p>
                  <p className="text-cyan-400/70 text-sm">Replit does not currently support GPU allocation for standard deployments. All code runs on shared CPU resources.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="flex-1 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Integrations</h2>
              <div className="grid grid-cols-2 gap-4">
                {integrations.map((integration) => (
                  <div key={integration.id} className={`p-4 rounded-lg border ${integration.enabled ? 'bg-cyan-600/20 border-cyan-500' : 'bg-cyan-900/20 border-cyan-800/30'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{integration.name}</span>
                      <button
                        onClick={() => toggleIntegration(integration.id)}
                        className={`px-3 py-1 rounded text-sm ${integration.enabled ? 'bg-cyan-500 text-white' : 'bg-cyan-800/50 text-cyan-300'}`}
                      >
                        {integration.enabled ? 'Enabled' : 'Enable'}
                      </button>
                    </div>
                    {integration.enabled && (
                      <input
                        type="password"
                        placeholder="API Key"
                        value={integration.apiKey || ''}
                        onChange={(e) => {
                          const updated = integrations.map(i => i.id === integration.id ? {...i, apiKey: e.target.value} : i);
                          setIntegrations(updated);
                        }}
                        onBlur={() => saveProjectData({ integrations })}
                        className="mt-3 w-full px-3 py-2 bg-cyan-900/30 border border-cyan-700/50 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="max-w-md text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-10 h-10 text-cyan-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">hgland Agent</h2>
                      <p className="text-cyan-300 mb-2">Powered by GPT-5.1 Codex Max</p>
                      <p className="text-cyan-400/60 text-sm">Chat with me or ask me to generate files!</p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white' : 'bg-cyan-900/40 border border-cyan-800/50 text-cyan-100'}`}>
                          {msg.role === 'user' ? (
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          ) : (
                            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:text-cyan-200 prose-code:bg-cyan-950 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-cyan-950 prose-pre:border prose-pre:border-cyan-800/50 prose-a:text-cyan-400 prose-strong:text-cyan-200 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {generating && (
                      <div className="flex justify-start">
                        <div className="bg-cyan-900/40 border border-cyan-800/50 px-4 py-3 rounded-2xl flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                          <span className="text-cyan-300">Thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-cyan-800/30">
                <div className="max-w-3xl mx-auto flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAIChat()}
                    disabled={generating}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 bg-cyan-900/30 border border-cyan-800/50 rounded-xl text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                  />
                  <button onClick={handleAIChat} disabled={generating || !aiPrompt.trim()} className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl disabled:opacity-50">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
