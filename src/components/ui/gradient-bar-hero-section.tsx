import React, { useState, useEffect } from 'react';
import { Github, Instagram, Linkedin, Menu, X } from 'lucide-react';

type AvatarProps = {
  imageSrc: string;
  delay: number;
};

const Avatar: React.FC<AvatarProps> = ({ imageSrc, delay }) => {
  return (
    <div 
      className="relative h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-full overflow-hidden border-2 border-gray-700 shadow-lg animate-fadeIn"
      style={{ animationDelay: `${delay}ms` }}
    >
      <img 
        src={imageSrc} 
        alt="User avatar" 
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
    </div>
  );
};

const TrustElements: React.FC = () => {
  const avatars = [
    "https://cdn.21st.dev/assets/mirror/ab/ab0f647dba1091b070028d8de5ab3cc388a593a06d99153be51753ea9b49fc22.jpg",
    "https://cdn.21st.dev/assets/mirror/9f/9fd3d91f1e05859a3508c169fbb76247a2b14bccc89d087a3ef85dc7261cde44.jpg",
    "https://cdn.21st.dev/assets/mirror/44/44202b1e265b1b96e590728d05f064b11f5fa64b4c7ca6b8caee1121d15db0ee.jpg",
    "https://cdn.21st.dev/assets/mirror/7f/7f2da0cfbb0e4343105ef0563456722d3e5b4b1fa15c32ae1e7f60742f534ef0.jpg",
    "https://cdn.21st.dev/assets/mirror/ea/ea1d27976e19df232b7bb8eb3e9a5bebe836f6d6fc3e61ff36f2e825a0753066.jpg",
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 my-4 sm:my-6 md:my-8 animate-fadeIn" style={{ animationDelay: '400ms' }}>
      <div className="flex -space-x-2 sm:-space-x-3 overflow-hidden p-1">
        {avatars.map((src, index) => (
          <Avatar key={index} imageSrc={src} delay={index * 100} />
        ))}
      </div>
      <div className="text-center sm:text-left">
        <p className="text-white font-medium text-xs sm:text-sm">Trusted by 10,000+ creators</p>
        <p className="text-gray-400 text-xs">Join our growing community today</p>
      </div>
    </div>
  );
};

interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  hoverColor: string;
}

const SocialLink: React.FC<SocialLinkProps> = ({ href, icon, hoverColor }) => {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`text-gray-400 ${hoverColor} transition-colors duration-300 p-2 rounded-full hover:bg-gray-800/50`}
    >
      {icon}
    </a>
  );
};

export interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  inputPlaceholder?: string;
  buttonText?: string;
  onEmailSubmit?: (email: string) => Promise<void> | void;
  isLoading?: boolean;
  isSuccess?: boolean;
  errorMessage?: string | null;
  onSecondaryAction?: () => void;
  secondaryActionText?: string;
  showSocialLinks?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  title = "Unlock Your Creative Potential",
  subtitle = "Experience the future of digital art with our cutting-edge AI tools. Create, edit, and share masterpieces in seconds.",
  badgeText = "Private Testing & Preview",
  inputPlaceholder = "Enter your email address",
  buttonText = "Join Waitlist",
  onEmailSubmit,
  isLoading = false,
  isSuccess = false,
  errorMessage = null,
  onSecondaryAction,
  secondaryActionText,
  showSocialLinks = true,
}) => {
  const [email, setEmail] = useState('');
  const [localSuccess, setLocalSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      setLocalSuccess(true);
    }
  }, [isSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting || isLoading) return;
    
    if (onEmailSubmit) {
      setIsSubmitting(true);
      try {
        await onEmailSubmit(email.trim());
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setLocalSuccess(true);
    }
  };

  const currentLoading = isLoading || isSubmitting;
  const showSuccessState = isSuccess || localSuccess;

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-hidden flex flex-col justify-between">
      {/* Background gradient bars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl transform rotate-12 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl transform -rotate-12 animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl transform rotate-45 animate-pulse" style={{ animationDuration: '7s' }}></div>
        
        {/* Subtle decorative grid/stripes */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Header/Navbar */}
      <header className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg">
              F
            </div>
            <span className="font-bold text-lg tracking-tight">Flawlesz</span>
          </div>

          {/* Social Links - Desktop */}
          {showSocialLinks && (
            <div className="hidden sm:flex items-center space-x-2">
              <SocialLink href="https://github.com" icon={<Github className="w-5 h-5" />} hoverColor="hover:text-white" />
              <SocialLink href="https://instagram.com" icon={<Instagram className="w-5 h-5" />} hoverColor="hover:text-pink-400" />
              <SocialLink href="https://linkedin.com" icon={<Linkedin className="w-5 h-5" />} hoverColor="hover:text-blue-400" />
            </div>
          )}

          {/* Mobile menu button */}
          <div className="sm:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-400 hover:text-white p-2"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-2 p-4 bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-800 animate-fadeIn">
            <div className="flex justify-center space-x-6 py-2">
              <SocialLink href="https://github.com" icon={<Github className="w-5 h-5" />} hoverColor="hover:text-white" />
              <SocialLink href="https://instagram.com" icon={<Instagram className="w-5 h-5" />} hoverColor="hover:text-pink-400" />
              <SocialLink href="https://linkedin.com" icon={<Linkedin className="w-5 h-5" />} hoverColor="hover:text-blue-400" />
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 text-center max-w-4xl mx-auto w-full">
        {/* Badge */}
        {badgeText && (
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-medium text-gray-300 backdrop-blur-md mb-6 sm:mb-8 animate-fadeIn shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{badgeText}</span>
          </div>
        )}

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-4 sm:mb-6 leading-tight sm:leading-none">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
            {title}
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed">
          {subtitle}
        </p>

        {/* Waitlist Form or Success Message */}
        <div className="w-full max-w-md mx-auto mb-6 sm:mb-8">
          {showSuccessState ? (
            <div className="p-4 sm:p-6 bg-gray-900/80 border border-emerald-500/40 rounded-2xl backdrop-blur-md animate-fadeIn shadow-xl">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">You're on the waitlist!</h3>
              <p className="text-xs sm:text-sm text-gray-400">
                We'll reach out with priority invite access as soon as spots open up.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={inputPlaceholder}
                  className="w-full px-4 py-3 sm:py-3.5 bg-gray-900/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 backdrop-blur-md transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={currentLoading}
                className="px-6 py-3 sm:py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 hover:from-purple-500 hover:via-pink-500 hover:to-red-400 text-white font-semibold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {currentLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Joining...</span>
                  </span>
                ) : (
                  buttonText
                )}
              </button>
            </form>
          )}

          {errorMessage && (
            <p className="mt-2 text-xs text-red-400 text-center">{errorMessage}</p>
          )}
        </div>

        {/* Secondary Back Action if provided */}
        {onSecondaryAction && secondaryActionText && (
          <div className="mb-4">
            <button
              onClick={onSecondaryAction}
              className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>{secondaryActionText}</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* Social Proof Trust Elements */}
        <TrustElements />
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-4 sm:px-6 py-4 text-center border-t border-gray-900 text-gray-500 text-xs">
        <p>© {new Date().getFullYear()} Flawlesz Inc. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HeroSection;
