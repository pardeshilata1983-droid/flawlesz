import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext.tsx';
import { ONBOARDING_QUESTIONS, OnboardingOption } from '../data/onboardingQuestions.ts';
import { OnboardingAnswers } from '../types.ts';
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2 } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { FlawWordmark } from '../components/FlawWordmark.tsx';

interface OnboardingPageProps {
  onNavigate: (path: string) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onNavigate }) => {
  const { user, saveOnboarding, loading: authLoading } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({
    user_type: user?.user_type || '',
    referral_source: user?.referral_source || '',
    project_type: user?.project_type || '',
    idea_stage: user?.idea_stage || '',
  });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const totalQuestions = ONBOARDING_QUESTIONS.length;
  const currentQuestion = ONBOARDING_QUESTIONS[currentStepIndex];

  // If user has already completed onboarding, allow quick escape or direct forward navigation
  const handleSkipOrGoToSubmit = () => {
    onNavigate('/flaw/submit');
  };

  const handleSelectOption = async (option: OnboardingOption) => {
    if (isSaving || isCompleted) return;

    setSelectedOptionId(option.id);
    const updatedAnswers: Partial<OnboardingAnswers> = {
      ...answers,
      [currentQuestion.id]: option.label,
    };
    setAnswers(updatedAnswers);

    // Auto-advance with subtle delay for optical feedback
    setTimeout(async () => {
      setSelectedOptionId(null);
      if (currentStepIndex < totalQuestions - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        // Final question answered - save all answers
        setIsSaving(true);
        try {
          console.log('[ONBOARDING] Submitting full onboarding profile:', updatedAnswers);
          await saveOnboarding({
            user_type: updatedAnswers.user_type || 'Founder',
            referral_source: updatedAnswers.referral_source || 'Other',
            project_type: updatedAnswers.project_type || 'Startup/business ideas',
            idea_stage: updatedAnswers.idea_stage || 'Just a thought',
          });
          setIsCompleted(true);
        } catch (err) {
          console.error('[ONBOARDING] Failed to save answers:', err);
          // Fallback advance anyway so user is not blocked
          setIsCompleted(true);
        } finally {
          setIsSaving(false);
        }
      }
    }, 240);
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setSelectedOptionId(null);
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header & Progress Bar */}
      <div className="max-w-2xl w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div
            onClick={() => onNavigate('/flaw')}
            className="inline-flex items-center gap-2.5 cursor-pointer"
          >
            <BrandLogo size="sm" rounded="sm" />
            <FlawWordmark size="md" />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#5A5A5A]">
              {isCompleted ? 'Completed' : `Step ${currentStepIndex + 1} of ${totalQuestions}`}
            </span>
            <button
              type="button"
              onClick={handleSkipOrGoToSubmit}
              className="text-xs text-[#7A7A7A] hover:text-[#111111] underline transition-colors cursor-pointer"
            >
              Skip
            </button>
          </div>
        </div>

        {/* Minimalist Progress Indicator */}
        <div className="w-full bg-[#E0DEDA] h-1 rounded-full overflow-hidden mb-8">
          <motion.div
            className="bg-[#111111] h-full"
            initial={{ width: '0%' }}
            animate={{
              width: isCompleted ? '100%' : `${((currentStepIndex + 1) / totalQuestions) * 100}%`,
            }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl w-full mx-auto my-auto py-4">
        <AnimatePresence mode="wait">
          {!isCompleted ? (
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Question Heading */}
              <div className="text-center sm:text-left">
                <span className="text-xs font-mono uppercase tracking-wider text-[#7A7A7A] block mb-1">
                  Question {currentStepIndex + 1}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                  {currentQuestion.title}
                </h1>
                <p className="text-sm text-[#5A5A5A] mt-1.5 leading-relaxed">
                  {currentQuestion.subtitle}
                </p>
              </div>

              {/* Visual Option Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {currentQuestion.options.map((option) => {
                  const isSelected =
                    selectedOptionId === option.id || answers[currentQuestion.id] === option.label;

                  return (
                    <motion.button
                      key={option.id}
                      id={`onboarding-opt-${option.id}`}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectOption(option)}
                      disabled={isSaving}
                      className={`cursor-pointer text-left p-4 rounded-xl border transition-all flex flex-col justify-between bg-[#FFFFFF] ${
                        isSelected
                          ? 'border-[#111111] ring-1 ring-[#111111]'
                          : 'border-[#E0DEDA] hover:border-[#111111]'
                      }`}
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F5F4F0] rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 border border-[#E0DEDA]/60">
                          <img
                            src={option.image}
                            alt={option.imageAlt}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain mix-blend-multiply"
                            loading="eager"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm sm:text-base text-[#111111] leading-snug">
                              {option.label}
                            </span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[#111111] text-white flex items-center justify-center flex-shrink-0 ml-1.5">
                                <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                              </div>
                            )}
                          </div>
                          {option.description && (
                            <p className="text-xs text-[#5A5A5A] mt-1 line-clamp-2 leading-relaxed">
                              {option.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E0DEDA]/70">
                {currentStepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A5A5A] hover:text-[#111111] py-2 px-3 rounded-lg border border-[#E0DEDA] bg-transparent hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                <p className="text-xs text-[#7A7A7A] font-mono text-right">
                  Click any option to auto-advance
                </p>
              </div>
            </motion.div>
          ) : (
            /* Final Confirmation Screen ("You're all set") */
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="bg-[#FFFFFF] border border-[#E0DEDA] rounded-2xl p-8 text-center space-y-6 shadow-sm"
            >
              <div className="w-14 h-14 bg-[#111111] text-white rounded-full mx-auto flex items-center justify-center">
                <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#7A7A7A] block mb-1">
                  Onboarding Complete
                </span>
                <h2 className="text-2xl font-bold text-[#111111]">
                  You're all set
                </h2>
                <p className="text-sm text-[#5A5A5A] max-w-md mx-auto mt-2 leading-relaxed">
                  Your profile preferences are saved. We'll calibrate competitor discovery and vulnerability audits to your focus area.
                </p>
              </div>

              {/* Summary pills */}
              <div className="bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl p-4 max-w-md mx-auto text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#7A7A7A] font-mono">Role</span>
                  <span className="font-semibold text-[#111111]">{answers.user_type || 'Founder'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#7A7A7A] font-mono">Referral</span>
                  <span className="font-semibold text-[#111111]">{answers.referral_source || 'Community'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#7A7A7A] font-mono">Project Focus</span>
                  <span className="font-semibold text-[#111111]">{answers.project_type || 'Startup ideas'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#7A7A7A] font-mono">Current Stage</span>
                  <span className="font-semibold text-[#111111]">{answers.idea_stage || 'Just a thought'}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="onboarding-launch-submit-btn"
                  type="button"
                  onClick={() => onNavigate('/flaw/submit')}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#E8481C] text-white font-medium text-sm hover:bg-[#D03E15] transition-colors cursor-pointer shadow-sm"
                >
                  <span>Start Validating Ideas</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Footer Note */}
      <div className="max-w-2xl w-full mx-auto text-center pt-6">
        <p className="text-xs text-[#7A7A7A] font-mono">
          Flawlesz AI — Know Before You Build • Idea Validation Engine
        </p>
      </div>
    </div>
  );
};
