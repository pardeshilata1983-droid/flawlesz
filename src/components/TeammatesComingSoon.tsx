import React, { useState } from 'react';
import { HeroSection } from './ui/gradient-bar-hero-section.tsx';

interface TeammatesComingSoonProps {
  onNavigate: (path: string) => void;
}

export const TeammatesComingSoon: React.FC<TeammatesComingSoonProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleWaitlistSubmit = async (email: string) => {
    if (!email.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/teammates/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }
      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <HeroSection
      badgeText="Private Testing & Preview"
      title="AI Teammates is coming soon"
      subtitle="We're building an autonomous AI engineering team that plans, writes, and ships code with you. Join the waitlist for priority access."
      inputPlaceholder="Enter your email address"
      buttonText="Join Waitlist"
      onEmailSubmit={handleWaitlistSubmit}
      isLoading={loading}
      isSuccess={success}
      errorMessage={errorMessage}
      onSecondaryAction={() => onNavigate('/flaw/submit')}
      secondaryActionText="Back to Validator"
      showSocialLinks={true}
    />
  );
};

