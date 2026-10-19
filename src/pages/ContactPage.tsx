import React, { useState } from 'react';
import { ArrowLeft, Mail, MessageSquare, Clock, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Footer } from '../components/Footer.tsx';

interface ContactPageProps {
  onNavigate: (path: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('billing');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!message.trim() || message.length < 10) {
      setFormError('Please enter a message of at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          message: message.trim(),
          company_website: honeypot // Honeypot field for spam protection
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit message.');
      }

      setIsSubmitted(true);
      // Dedicated Thank-You Page redirect confirming what happens next
      setTimeout(() => {
        onNavigate('/thank-you');
      }, 400);
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        {/* Back navigation */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('/flaw')}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </button>
        </div>

        {/* Header */}
        <div className="border-b border-[#E0DEDA] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/5 text-[#111111] text-xs font-mono mb-4">
            <Mail className="w-3.5 h-3.5 text-[#E8481C]" />
            <span>Customer Support & Inquiries</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            Contact Us
          </h1>
          <p className="mt-2 text-sm text-[#5A5A5A]">
            Have questions about your subscription, validation checks, or partnership opportunities? We're here to help.
          </p>
        </div>

        {/* Two Column Layout: Info Cards & Form */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Direct Contacts */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-xl bg-white border border-[#E0DEDA] space-y-4 shadow-xs">
              <h2 className="text-base font-semibold text-[#111111]">
                Direct Contact Channels
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#E8481C] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#111111]">Customer Support</p>
                    <a href="mailto:support@flaw.app" className="text-[#555555] hover:text-[#E8481C] font-mono">
                      support@flaw.app
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#E8481C] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#111111]">Billing & Invoices</p>
                    <a href="mailto:billing@flaw.app" className="text-[#555555] hover:text-[#E8481C] font-mono">
                      billing@flaw.app
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#E8481C] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#111111]">Privacy & Legal</p>
                    <a href="mailto:privacy@flaw.app" className="text-[#555555] hover:text-[#E8481C] font-mono">
                      privacy@flaw.app
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#E0DEDA] space-y-3 shadow-xs text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#111111]">
                <Clock className="w-4 h-4 text-[#E8481C]" />
                <span>Response Timelines</span>
              </div>
              <p className="text-[#555555] leading-relaxed">
                Our support team operates Monday through Friday, 9:00 AM – 6:00 PM IST. We strive to respond to all inquiries within <strong>24 to 48 business hours</strong>.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#E0DEDA] space-y-3 shadow-xs text-xs font-mono">
              <div className="flex items-center gap-2 font-semibold text-[#111111]">
                <MapPin className="w-4 h-4 text-[#E8481C]" />
                <span>Merchant Information</span>
              </div>
              <div className="text-[#555555] space-y-1">
                <p><strong>Business Name:</strong> Flaw Validation Technologies</p>
                <p><strong>Country:</strong> India</p>
                <p><strong>Payment Gateway:</strong> Razorpay Authorized Merchant</p>
              </div>
            </div>
          </div>

          {/* Right Column: Support Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-xl bg-white border border-[#E0DEDA] shadow-xs">
              <h2 className="text-lg font-semibold text-[#111111] mb-1">
                Send a Message
              </h2>
              <p className="text-xs text-[#555555] mb-6">
                Fill out the form below and our engineering and support team will get back to you.
              </p>

              {isSubmitted ? (
                <div className="p-6 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="text-base font-semibold text-emerald-900">
                    Message Received
                  </h3>
                  <p className="text-xs text-emerald-700 leading-relaxed max-w-sm mx-auto">
                    Thank you for contacting us! A confirmation has been logged and our team will reply to <strong>{email}</strong> within 24-48 business hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Send Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Invisible Honeypot Spam Field */}
                  <div style={{ display: 'none' }} aria-hidden="true">
                    <label htmlFor="company_website_hp">Leave this field blank</label>
                    <input
                      id="company_website_hp"
                      type="text"
                      name="company_website"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  {formError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#333333] mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Harshit Sharma"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#E0DEDA] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111111]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#333333] mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#E0DEDA] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111111]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#333333] mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[#E0DEDA] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111111]"
                    >
                      <option value="billing">Billing, Invoices & Refunds</option>
                      <option value="technical">Technical Issue or Bug Report</option>
                      <option value="tiers">Subscription & Tier Upgrades</option>
                      <option value="privacy">Data Privacy & Account Deletion</option>
                      <option value="general">General Inquiry / Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#333333] mb-1">
                      Message *
                    </label>
                    <textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe your question or issue in detail..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[#E0DEDA] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111111]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Sending message...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
