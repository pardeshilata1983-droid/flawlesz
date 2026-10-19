import React, { useState } from 'react';
import {
  Terminal,
  Cpu,
  Shield,
  Key,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Lock,
  ArrowRight,
  Zap,
  Layers,
  Search,
  Globe,
  FileCode,
  CheckCircle2,
  Clock,
  Sparkles,
  Server
} from 'lucide-react';
import { Navbar } from '../components/Navbar.tsx';
import { Footer } from '../components/Footer.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface ConnectPageProps {
  onNavigate: (path: string) => void;
}

export const ConnectPage: React.FC<ConnectPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'claude' | 'cursor' | 'vscode' | 'curl'>('claude');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://flawlesz.dev';
  const mcpUrl = `${origin}/mcp`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col justify-between selection:bg-[#E8481C] selection:text-white">
      <Navbar currentPath="/flaw/connect" onNavigate={onNavigate} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        {/* Header Hero */}
        <div className="border-b border-[#E0DEDA] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] text-white text-xs font-mono mb-4">
            <Terminal className="w-3.5 h-3.5 text-[#E8481C]" />
            <span>Remote Model Context Protocol (MCP)</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
            Connect Your AI to Flawlesz
          </h1>
          <p className="mt-3 text-base sm:text-lg text-[#5A5A5A] max-w-3xl leading-relaxed">
            Equip your favorite developer AI environments—including Claude Code, Cursor, VS Code, Windsurf, and custom autonomous agents—with Flawlesz’s adversarial startup validation, site auditor, technical spec generator, and startup graveyard database.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('/flaw/account')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8481C] hover:bg-[#d63f15] text-white text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>{user ? 'Manage Personal Access Tokens' : 'Sign in to Get Token'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href="#tools-directory"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E0DEDA] hover:bg-[#FAF9F5] text-[#111111] text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#7A7A7A]" />
              <span>Explore 5 Remote Tools</span>
            </a>
          </div>
        </div>

        {/* SECTION 1: ARCHITECTURE & HOW IT WORKS */}
        <section className="mb-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-[#E8481C] mb-4">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] mb-2 font-mono">
                Streamable HTTP Transport
              </h3>
              <p className="text-xs text-[#5A5A5A] leading-relaxed">
                Powered by the official <code className="font-mono text-[#111111]">@modelcontextprotocol/sdk</code> over a stateless HTTP transport at <code className="font-mono text-[#E8481C]">{mcpUrl}</code>. Zero sticky session locks, sub-second cold starts, and 100% Cloud Run compatible.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-4">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] mb-2 font-mono">
                Personal Access Tokens
              </h3>
              <p className="text-xs text-[#5A5A5A] leading-relaxed">
                Protected by SHA-256 hashed bearer tokens (<code className="font-mono text-[#111111]">flaw_pat_...</code>). Plaintext tokens are displayed once upon creation and never stored. Active tokens can be revoked instantly at any time.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] mb-2 font-mono">
                Prompt Injection Immune
              </h3>
              <p className="text-xs text-[#5A5A5A] leading-relaxed">
                Live search citations and web audit texts are strictly quarantined in <code className="font-mono text-[#111111]">untrusted_web_content</code> with HTML and control codes scrubbed to protect your agent from indirect prompt injections.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: SETUP & CLIENT CONFIGURATION */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-5 h-5 text-[#E8481C]" />
            <h2 className="text-xl font-bold tracking-tight text-[#111111]">
              Quick Setup Guide
            </h2>
          </div>
          <p className="text-xs text-[#5A5A5A] mb-6">
            Generate an access token in your Flawlesz account, then paste the corresponding configuration into your AI client.
          </p>

          <div className="bg-[#111111] text-[#E9ECEA] rounded-2xl p-6 sm:p-8 border border-[#2A2A2E] shadow-lg">
            {/* Steps bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-[#2A2A2E] mb-6 text-xs font-mono">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E8481C] text-white flex items-center justify-center font-bold shrink-0">1</span>
                <div>
                  <span className="font-bold text-white block">Generate Token</span>
                  <span className="text-[#888]">Visit Account Settings &gt; Connect your AI</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E8481C] text-white flex items-center justify-center font-bold shrink-0">2</span>
                <div>
                  <span className="font-bold text-white block">Copy Secret Key</span>
                  <span className="text-[#888]">Save your <code className="text-[#00E599]">flaw_pat_...</code> token</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E8481C] text-white flex items-center justify-center font-bold shrink-0">3</span>
                <div>
                  <span className="font-bold text-white block">Connect Client</span>
                  <span className="text-[#888]">Add remote HTTP server in your IDE</span>
                </div>
              </div>
            </div>

            {/* Config Tabs */}
            <div className="flex items-center gap-2 border-b border-[#333333] mb-4 text-xs font-mono overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('claude')}
                className={`px-4 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === 'claude'
                    ? 'border-[#E8481C] text-white'
                    : 'border-transparent text-[#888] hover:text-white'
                }`}
              >
                Claude Code
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cursor')}
                className={`px-4 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === 'cursor'
                    ? 'border-[#E8481C] text-white'
                    : 'border-transparent text-[#888] hover:text-white'
                }`}
              >
                Cursor IDE
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vscode')}
                className={`px-4 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === 'vscode'
                    ? 'border-[#E8481C] text-white'
                    : 'border-transparent text-[#888] hover:text-white'
                }`}
              >
                VS Code / Roo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('curl')}
                className={`px-4 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === 'curl'
                    ? 'border-[#E8481C] text-white'
                    : 'border-transparent text-[#888] hover:text-white'
                }`}
              >
                Generic HTTP (cURL)
              </button>
            </div>

            {/* Code Box */}
            <div className="relative">
              {activeTab === 'claude' && (
                <div className="bg-[#18181A] rounded-xl p-4 border border-[#2A2A2E] font-mono text-xs text-[#E0E0E0]">
                  <p className="text-[#888] mb-2">// Run in your terminal where Claude Code CLI is installed:</p>
                  <pre className="whitespace-pre-wrap select-all text-[#00E599]">
{`claude mcp add --transport http flawlesz ${mcpUrl} -H "Authorization: Bearer YOUR_FLAWLESZ_TOKEN"`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`claude mcp add --transport http flawlesz ${mcpUrl} -H "Authorization: Bearer YOUR_FLAWLESZ_TOKEN"`, 'claude')}
                    className="absolute top-4 right-4 p-2 bg-[#252528] hover:bg-[#333] rounded-lg text-white transition-colors cursor-pointer"
                    title="Copy command"
                  >
                    {copiedIndex === 'claude' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {activeTab === 'cursor' && (
                <div className="bg-[#18181A] rounded-xl p-4 border border-[#2A2A2E] font-mono text-xs text-[#E0E0E0]">
                  <p className="text-[#888] mb-2">// Add to your project's .cursor/mcp.json or global ~/.cursor/mcp.json:</p>
                  <pre className="whitespace-pre-wrap select-all text-[#E0E0E0]">
{`{
  "mcpServers": {
    "flawlesz": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_FLAWLESZ_TOKEN"
      }
    }
  }
}`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`{\n  "mcpServers": {\n    "flawlesz": {\n      "url": "${mcpUrl}",\n      "headers": {\n        "Authorization": "Bearer YOUR_FLAWLESZ_TOKEN"\n      }\n    }\n  }\n}`, 'cursor')}
                    className="absolute top-4 right-4 p-2 bg-[#252528] hover:bg-[#333] rounded-lg text-white transition-colors cursor-pointer"
                    title="Copy JSON"
                  >
                    {copiedIndex === 'cursor' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {activeTab === 'vscode' && (
                <div className="bg-[#18181A] rounded-xl p-4 border border-[#2A2A2E] font-mono text-xs text-[#E0E0E0]">
                  <p className="text-[#888] mb-2">// In VS Code with Cline or Roo Code extension mcp_settings.json:</p>
                  <pre className="whitespace-pre-wrap select-all text-[#E0E0E0]">
{`{
  "mcpServers": {
    "flawlesz": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_FLAWLESZ_TOKEN"
      }
    }
  }
}`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`{\n  "mcpServers": {\n    "flawlesz": {\n      "url": "${mcpUrl}",\n      "headers": {\n        "Authorization": "Bearer YOUR_FLAWLESZ_TOKEN"\n      }\n    }\n  }\n}`, 'vscode')}
                    className="absolute top-4 right-4 p-2 bg-[#252528] hover:bg-[#333] rounded-lg text-white transition-colors cursor-pointer"
                    title="Copy configuration"
                  >
                    {copiedIndex === 'vscode' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {activeTab === 'curl' && (
                <div className="bg-[#18181A] rounded-xl p-4 border border-[#2A2A2E] font-mono text-xs text-[#E0E0E0]">
                  <p className="text-[#888] mb-2">// Initialize handshake and list available tools via cURL:</p>
                  <pre className="whitespace-pre-wrap select-all text-[#00E599]">
{`curl -X POST "${mcpUrl}" \\
  -H "Authorization: Bearer YOUR_FLAWLESZ_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`curl -X POST "${mcpUrl}" \\\n  -H "Authorization: Bearer YOUR_FLAWLESZ_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "jsonrpc": "2.0",\n    "id": 1,\n    "method": "tools/list"\n  }'`, 'curl')}
                    className="absolute top-4 right-4 p-2 bg-[#252528] hover:bg-[#333] rounded-lg text-white transition-colors cursor-pointer"
                    title="Copy cURL"
                  >
                    {copiedIndex === 'curl' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 3: TOOLS DIRECTORY */}
        <section id="tools-directory" className="mb-14 scroll-mt-20">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-[#E8481C]" />
            <h2 className="text-xl font-bold tracking-tight text-[#111111]">
              Registered MCP Tools Directory
            </h2>
          </div>
          <p className="text-xs text-[#5A5A5A] mb-6">
            All tools return concise human-readable text alongside structured JSON payloads capped to ~6,000 tokens for optimal agent context management.
          </p>

          <div className="space-y-6">
            {/* Tool 1: check_idea */}
            <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E0DEDA] mb-4">
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2.5 py-1 rounded bg-[#E8481C]/10 text-[#E8481C] text-xs font-bold">
                    check_idea
                  </span>
                  <span className="text-xs text-[#7A7A7A]">Adversarial Idea Stress-Testing</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">openWorld: true</span>
                  <span className="px-2 py-0.5 rounded bg-[#F5F4F0] text-[#5A5A5A] border border-[#E0DEDA]">Target &lt;45s</span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Counts as 1 Check</span>
                </div>
              </div>
              <p className="text-xs text-[#444] mb-4 leading-relaxed">
                Adversarially evaluates a startup idea or product concept against live web competitors, structural flaws with severity ratings, defensible pivots, and graveyard precedents.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-[#FAF9F5] p-4 rounded-xl border border-[#E0DEDA]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Inputs</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• <code className="text-[#E8481C]">idea</code> (string, 20–4000 chars) [required]</li>
                    <li>• <code className="text-[#111]">context</code> (string, max 2000 chars) [optional]</li>
                    <li>• <code className="text-[#111]">depth</code>: <code className="text-emerald-700">"quick"</code> (default) | <code className="text-purple-700">"deep"</code></li>
                    <li>• <code className="text-[#111]">save</code>: boolean (default: true)</li>
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Key Returns</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• <code className="text-[#111]">flaws[]</code> with title, explanation, severity</li>
                    <li>• <code className="text-[#111]">similar_products[]</code> with sources</li>
                    <li>• <code className="text-[#111]">refined_versions[]</code> &amp; strategic pivots</li>
                    <li>• <code className="text-[#111]">graveyard[]</code> failure precedents</li>
                    <li>• <code className="text-[#111]">result_url</code> (when saved to account)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tool 2: audit_site */}
            <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E0DEDA] mb-4">
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2.5 py-1 rounded bg-[#E8481C]/10 text-[#E8481C] text-xs font-bold">
                    audit_site
                  </span>
                  <span className="text-xs text-[#7A7A7A]">Live URL &amp; Landing Page Inspection</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">readOnly: true</span>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">SSRF Guarded</span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Counts as 1 Check</span>
                </div>
              </div>
              <p className="text-xs text-[#444] mb-4 leading-relaxed">
                Inspects a live public URL. Verifies HTTP reachability, SSL encryption, SPA shell rendering vs server-rendered content, and SEO metadata. Strictly restricts to ports 80/443 and blocks private, local, and link-local subnets before and after HTTP redirects.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-[#FAF9F5] p-4 rounded-xl border border-[#E0DEDA]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Inputs</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• <code className="text-[#E8481C]">url</code> (valid public http/https URL) [required]</li>
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Key Returns</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• <code className="text-[#111]">score_summary</code> (pass, warn, fail, total)</li>
                    <li>• <code className="text-[#111]">checks[]</code> with severity &amp; diagnostics</li>
                    <li>• <code className="text-[#111]">untrusted_web_content</code> (sanitized text)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tool 3: get_build_spec */}
            <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E0DEDA] mb-4">
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2.5 py-1 rounded bg-[#E8481C]/10 text-[#E8481C] text-xs font-bold">
                    get_build_spec
                  </span>
                  <span className="text-xs text-[#7A7A7A]">Implementation Technical Specification</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">readOnly: true</span>
                  <span className="px-2 py-0.5 rounded bg-[#F5F4F0] text-[#5A5A5A] border border-[#E0DEDA]">&lt;1,500 Words</span>
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Counts as 1 Gen</span>
                </div>
              </div>
              <p className="text-xs text-[#444] mb-4 leading-relaxed">
                Synthesizes a production-grade markdown technical specification for your software architect or coding assistant. Includes relational schema, endpoints, authentication flows, payment notes, edge cases, acceptance tests, and a production security checklist.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-[#FAF9F5] p-4 rounded-xl border border-[#E0DEDA]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Inputs</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• <code className="text-[#111]">check_id</code> (string, e.g. "conv-...") [optional]</li>
                    <li>• <code className="text-[#111]">idea</code> (string, direct product prompt) [optional]</li>
                    <li>• <code className="text-[#111]">stack</code> (string, preferred tech stack) [optional]</li>
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Key Returns</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• GitHub-flavored Markdown specification</li>
                    <li>• Architecture overview &amp; route tree</li>
                    <li>• SQL schema, DDL &amp; relations</li>
                    <li>• Flaw mitigation engineering checklist</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tool 4: graveyard_search */}
            <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E0DEDA] mb-4">
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2.5 py-1 rounded bg-[#E8481C]/10 text-[#E8481C] text-xs font-bold">
                    graveyard_search
                  </span>
                  <span className="text-xs text-[#7A7A7A]">Startup Shutdowns &amp; Post-Mortems</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">readOnly: true</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Free Quota</span>
                </div>
              </div>
              <p className="text-xs text-[#444] mb-4 leading-relaxed">
                Queries Flawlesz’s curated database of failed startups, autopsy findings, shutdown dates, and actionable lessons. Helps your AI evaluate category risks before writing code.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-[#FAF9F5] p-4 rounded-xl border border-[#E0DEDA]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Inputs</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• <code className="text-[#E8481C]">query</code> (market sector or keyword) [required]</li>
                    <li>• <code className="text-[#111]">limit</code> (1 to 10, default: 5) [optional]</li>
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Key Returns</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• <code className="text-[#111]">precedents[]</code> with cause &amp; lessons</li>
                    <li>• Founded and shutdown years</li>
                    <li>• Citation and post-mortem URLs</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tool 5: my_checks */}
            <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E0DEDA] mb-4">
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2.5 py-1 rounded bg-[#E8481C]/10 text-[#E8481C] text-xs font-bold">
                    my_checks
                  </span>
                  <span className="text-xs text-[#7A7A7A]">Authenticated User History &amp; Reports</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">readOnly: true</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Free Quota</span>
                </div>
              </div>
              <p className="text-xs text-[#444] mb-4 leading-relaxed">
                Retrieves saved checks from your private Flawlesz account. When called with an ID, returns the full validation findings and competitor breakdown. When called without an ID, returns recent summaries.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-[#FAF9F5] p-4 rounded-xl border border-[#E0DEDA]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Inputs</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• <code className="text-[#111]">id</code> (string, specific check ID) [optional]</li>
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7A7A] block mb-1">Key Returns</span>
                  <ul className="space-y-1 text-[#333]">
                    <li>• <code className="text-[#111]">recent_checks[]</code> list of summaries</li>
                    <li>• Full teardown flaws, competitors, pivots when ID passed</li>
                    <li>• Direct link back to Flawlesz report UI</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: LIMITS, FAIR USE & PRIVACY */}
        <section className="mb-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                <Clock className="w-4 h-4 text-[#E8481C]" />
                <span>Rate Limits &amp; Concurrency</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#444] leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>30 calls per minute</strong> per personal token.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Max 2 concurrent heavy operations</strong> per user account to prevent queue starvation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Unified quota:</strong> Calls share the exact same checks and generation balance as the web application. When your limit is reached, an actionable error with upgrade URL is returned.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Failed auth protection:</strong> 10 consecutive failed attempts per minute temporarily blocks the calling IP.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Privacy &amp; Data Isolation</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#444] leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Stateless Processing:</strong> Each MCP tool invocation spins up an ephemeral server instance. No session cookies or browser traces are left behind.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Private Execution (<code className="font-mono text-[#E8481C]">save: false</code>):</strong> Set <code className="font-mono">save: false</code> in <code className="font-mono">check_idea</code> to skip database persistence and omit your concept from graveyard collections.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Hashed Tokens:</strong> Tokens are salted and hashed via SHA-256 before writing to the PostgreSQL database. Plaintext tokens cannot be read even by database administrators.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Direct Delivery:</strong> All outputs stream exclusively into your connected AI client over TLS/HTTPS.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <div className="p-8 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <h3 className="text-base font-bold text-[#111111]">
              Ready to connect your coding assistant?
            </h3>
            <p className="text-xs text-[#5A5A5A] mt-1">
              Create your personal access token in seconds and start validating ideas directly from your command line.
            </p>
          </div>
          <button
            onClick={() => onNavigate('/flaw/account')}
            className="px-6 py-2.5 rounded-xl bg-[#111111] hover:bg-[#222222] text-white text-xs font-mono font-bold transition-all shrink-0 cursor-pointer"
          >
            Go to Account &gt;
          </button>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
