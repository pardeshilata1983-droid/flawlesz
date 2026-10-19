import studentImg from '../assets/images/onboarding_student_1789287921806.jpg';
import professionalImg from '../assets/images/onboarding_professional_1789287936302.jpg';
import founderImg from '../assets/images/onboarding_founder_1789287954649.jpg';
import hobbyistImg from '../assets/images/onboarding_hobbyist_1789287966301.jpg';

import hackersImg from '../assets/images/onboarding_hackers_1789287976684.jpg';
import twitterImg from '../assets/images/onboarding_twitter_1789288010613.jpg';
import friendImg from '../assets/images/onboarding_friend_1789288024603.jpg';
import otherImg from '../assets/images/onboarding_other_1789288036560.jpg';

import startupIdeasImg from '../assets/images/onboarding_startupideas_1789288046798.jpg';
import sideProjectsImg from '../assets/images/onboarding_sideprojects_1789288061070.jpg';
import homeProjectsImg from '../assets/images/onboarding_home_1789288072502.jpg';
import mixEverythingImg from '../assets/images/onboarding_mix_1789288083191.jpg';

import justThoughtImg from '../assets/images/onboarding_justthought_1789288093009.jpg';
import planningImg from '../assets/images/onboarding_planning_1789288102650.jpg';
import buildingImg from '../assets/images/onboarding_building_1789288118034.jpg';
import launchedImg from '../assets/images/onboarding_launched_1789288129512.jpg';

export interface OnboardingOption {
  id: string;
  label: string;
  description?: string;
  image: string;
  imageAlt: string;
}

export interface OnboardingQuestion {
  id: 'user_type' | 'referral_source' | 'project_type' | 'idea_stage';
  title: string;
  subtitle: string;
  options: OnboardingOption[];
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'user_type',
    title: 'What best describes you?',
    subtitle: 'Help us tailor analysis depth and feedback to your background.',
    options: [
      {
        id: 'student',
        label: 'Student',
        description: 'Learning, researching, or building campus projects',
        image: studentImg,
        imageAlt: 'Graduation cap and notebook illustration',
      },
      {
        id: 'professional',
        label: 'Working professional',
        description: 'Applying domain expertise or testing enterprise tools',
        image: professionalImg,
        imageAlt: 'Briefcase and workspace desk accessories illustration',
      },
      {
        id: 'founder',
        label: 'Founder',
        description: 'Building, validating, or scaling a full startup',
        image: founderImg,
        imageAlt: 'Rocket taking flight into space illustration',
      },
      {
        id: 'hobbyist',
        label: 'Hobbyist builder',
        description: 'Tinkering, exploring hacks, and crafting cool side software',
        image: hobbyistImg,
        imageAlt: 'Craft tool set with wrench and screwdriver illustration',
      },
    ],
  },
  {
    id: 'referral_source',
    title: 'Where did you hear about Flawlesz AI?',
    subtitle: 'Tell us where you discovered our validation platform.',
    options: [
      {
        id: 'hackers_dev',
        label: 'Hackers Dev community',
        description: 'Found via community discussions or developer showcases',
        image: hackersImg,
        imageAlt: 'Terminal code editor window with brackets illustration',
      },
      {
        id: 'twitter',
        label: 'Twitter/X',
        description: 'Saw posts, threads, or shares from builders',
        image: twitterImg,
        imageAlt: 'Social media activity stream and signal feed illustration',
      },
      {
        id: 'friend_colleague',
        label: 'Friend or colleague',
        description: 'Recommended directly by a teammate or partner',
        image: friendImg,
        imageAlt: 'Two overlapping conversation dialogue bubbles illustration',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Search engine, blog post, newsletter, or event',
        image: otherImg,
        imageAlt: 'Navigation compass rose pointing north illustration',
      },
    ],
  },
  {
    id: 'project_type',
    title: 'What kind of ideas do you usually work on?',
    subtitle: 'We calibrate competitor intelligence to your problem domain.',
    options: [
      {
        id: 'startup_business',
        label: 'Startup/business ideas',
        description: 'Commercial ventures, SaaS platforms, and marketplaces',
        image: startupIdeasImg,
        imageAlt: 'Upward growth trend line and bar chart illustration',
      },
      {
        id: 'side_projects',
        label: 'Side projects',
        description: 'Weekend apps, developer tools, and micro-utilities',
        image: sideProjectsImg,
        imageAlt: 'Laptop open next to a coffee mug illustration',
      },
      {
        id: 'home_personal',
        label: 'Home/personal projects',
        description: 'Automations, lifestyle tools, and personal utilities',
        image: homeProjectsImg,
        imageAlt: 'House structure outline illustration',
      },
      {
        id: 'mix_everything',
        label: 'Mix of everything',
        description: 'A diverse blend of experiments across all categories',
        image: mixEverythingImg,
        imageAlt: 'Intersecting geometric polygon shapes illustration',
      },
    ],
  },
  {
    id: 'idea_stage',
    title: 'How far along is your current idea?',
    subtitle: 'Determines whether we focus on conceptual viability or launch risks.',
    options: [
      {
        id: 'just_thought',
        label: 'Just a thought',
        description: 'Early hypothesis or spark waiting to be explored',
        image: justThoughtImg,
        imageAlt: 'Glowing filament lightbulb idea spark illustration',
      },
      {
        id: 'actively_planning',
        label: 'Actively planning',
        description: 'Drafting requirements, wireframing, and architecture',
        image: planningImg,
        imageAlt: 'Clipboard holding a task checklist blueprint illustration',
      },
      {
        id: 'already_building',
        label: 'Already building',
        description: 'Writing code, setting up repos, or training models',
        image: buildingImg,
        imageAlt: 'Pair of interlocking mechanical machinery gears illustration',
      },
      {
        id: 'already_launched',
        label: 'Already launched',
        description: 'Live product in user hands seeking growth or pivots',
        image: launchedImg,
        imageAlt: 'Orbital communication satellite sending signals illustration',
      },
    ],
  },
];
