export const colors = {
  // Primary Color Palette - Sophisticated Green Theme
  primary: {
    50: '#F0F9F0',     // Lightest green tint
    100: '#E1F3E1',    // Very light green
    200: '#C8E8C8',    // Light green
    300: '#A0D4A0',    // Medium light green  
    400: '#7BC47B',    // Medium green
    500: '#A0C878',    // Main primary (your original)
    600: '#8BB563',    // Darker green
    700: '#6F9A4F',    // Dark green
    800: '#5A7D3F',    // Very dark green
    900: '#4A6632',    // Darkest green
  },
  
  // Secondary Palette - Complementary Warm Tones
  secondary: {
    50: '#FEFDF8',
    100: '#FDFBF0', 
    200: '#FAF6E9',
    300: '#F5F0DC',
    400: '#EDDF9D',
    500: '#DDEB9D',    // Your original secondary
    600: '#C4D675',
    700: '#A8C054',
    800: '#8FA043',
    900: '#768336',
  },
  
  // Neutral Palette - Refined Grays
  neutral: {
    0: '#FFFFFF',      // Pure white
    50: '#FFFDF6',     // Off-white (your background)
    100: '#F8F9FA',    // Very light gray
    200: '#E9ECEF',    // Light gray
    300: '#DEE2E6',    // Medium light gray
    400: '#CED4DA',    // Medium gray
    500: '#ADB5BD',    // Mid gray
    600: '#6C757D',    // Dark medium gray
    700: '#495057',    // Dark gray
    800: '#343A40',    // Very dark gray
    900: '#212529',    // Darkest gray
    950: '#1A1D20',    // Near black
  },
  
  // Semantic Colors - Enhanced for better UX
  semantic: {
    success: {
      light: '#D4EDDA',
      main: '#28A745',
      dark: '#155724',
      bg: 'rgba(40, 167, 69, 0.1)',
    },
    error: {
      light: '#F8D7DA', 
      main: '#DC3545',
      dark: '#721C24',
      bg: 'rgba(220, 53, 69, 0.1)',
    },
    warning: {
      light: '#FFF3CD',
      main: '#FFC107', 
      dark: '#856404',
      bg: 'rgba(255, 193, 7, 0.1)',
    },
    info: {
      light: '#CCE7F0',
      main: '#17A2B8',
      dark: '#0C5460',
      bg: 'rgba(23, 162, 184, 0.1)',
    },
  },
  
  // Text Colors - Optimized for Readability
  text: {
    primary: '#1A1D20',       // Highest contrast
    secondary: '#343A40',     // High contrast
    tertiary: '#495057',      // Medium contrast
    quaternary: '#6C757D',    // Lower contrast
    disabled: '#ADB5BD',      // Disabled state
    inverse: '#FFFFFF',       // On dark backgrounds
    link: '#A0C878',          // Links
    linkHover: '#6F9A4F',     // Link hover
  },
  
  // Border Colors - Subtle Hierarchy
  border: {
    light: '#E9ECEF',
    medium: '#DEE2E6', 
    dark: '#CED4DA',
    focus: '#A0C878',
    error: '#DC3545',
    success: '#28A745',
  },
  
  // Shadow System - Professional Depth & Lighting
  shadow: {
    // Basic shadows with enhanced realism
    xs: 'rgba(0, 0, 0, 0.02)',
    sm: 'rgba(0, 0, 0, 0.04)',
    md: 'rgba(0, 0, 0, 0.08)',
    lg: 'rgba(0, 0, 0, 0.12)',
    xl: 'rgba(0, 0, 0, 0.16)',
    '2xl': 'rgba(0, 0, 0, 0.20)',
    '3xl': 'rgba(0, 0, 0, 0.25)',
    
    // Sophisticated multi-layered shadows
    elegant: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.12)',
    premium: '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    luxury: '0 8px 25px rgba(0, 0, 0, 0.08), 0 3px 10px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    floating: '0 12px 24px rgba(0, 0, 0, 0.1), 0 6px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)',
    dramatic: '0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06)',
    
    // Colored shadows with sophistication
    colored: 'rgba(160, 200, 120, 0.15)',
    coloredSoft: 'rgba(160, 200, 120, 0.08)',
    coloredGlow: '0 0 20px rgba(160, 200, 120, 0.3), 0 0 40px rgba(160, 200, 120, 0.1)',
    
    // Semantic shadows
    success: 'rgba(40, 167, 69, 0.15)',
    successGlow: '0 0 20px rgba(40, 167, 69, 0.25), 0 0 40px rgba(40, 167, 69, 0.1)',
    error: 'rgba(220, 53, 69, 0.15)',
    errorGlow: '0 0 20px rgba(220, 53, 69, 0.25), 0 0 40px rgba(220, 53, 69, 0.1)',
    warning: 'rgba(255, 193, 7, 0.15)',
    warningGlow: '0 0 20px rgba(255, 193, 7, 0.25), 0 0 40px rgba(255, 193, 7, 0.1)',
    info: 'rgba(23, 162, 184, 0.15)',
    infoGlow: '0 0 20px rgba(23, 162, 184, 0.25), 0 0 40px rgba(23, 162, 184, 0.1)',
    
    // Interactive shadows
    hover: '0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)',
    active: '0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(0, 0, 0, 0.1)',
    focus: '0 0 0 3px rgba(160, 200, 120, 0.2), 0 0 0 6px rgba(160, 200, 120, 0.1)',
    
    // Specialized effects
    inset: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
    glass: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    neumorphism: '8px 8px 16px rgba(163, 177, 198, 0.15), -8px -8px 16px rgba(255, 255, 255, 0.7)',
    glow: '0 0 30px rgba(160, 200, 120, 0.4), 0 0 60px rgba(160, 200, 120, 0.2), 0 0 90px rgba(160, 200, 120, 0.1)',
  },
  
  // Gradient System - Professional & Sophisticated
  gradient: {
    // Primary gradients with depth and sophistication
    primary: 'linear-gradient(135deg, #A0C878 0%, #8BB563 25%, #DDEB9D 75%, #F5F0DC 100%)',
    primaryHero: 'linear-gradient(135deg, #A0C878 0%, #7BC47B 20%, #DDEB9D 60%, #C4D675 80%, #F5F0DC 100%)',
    primaryGlass: 'linear-gradient(135deg, rgba(160, 200, 120, 0.15) 0%, rgba(221, 235, 157, 0.1) 100%)',
    
    // Sophisticated card gradients
    card: 'linear-gradient(145deg, #FFFFFF 0%, rgba(248, 249, 250, 0.8) 50%, #F8F9FA 100%)',
    cardElevated: 'linear-gradient(145deg, #FFFFFF 0%, rgba(240, 249, 240, 0.3) 30%, #F8F9FA 70%, rgba(225, 243, 225, 0.2) 100%)',
    cardPremium: 'linear-gradient(145deg, #FFFFFF 0%, rgba(160, 200, 120, 0.02) 25%, rgba(221, 235, 157, 0.03) 75%, #FDFBF0 100%)',
    
    // Background gradients with atmospheric depth
    background: 'linear-gradient(135deg, #FFFDF6 0%, rgba(250, 246, 233, 0.8) 25%, #FAF6E9 50%, rgba(245, 240, 220, 0.9) 75%, #F5F0DC 100%)',
    backgroundRadial: 'radial-gradient(ellipse at top, #FFFDF6 0%, rgba(250, 246, 233, 0.9) 35%, #FAF6E9 70%, #F5F0DC 100%)',
    backgroundMesh: 'conic-gradient(from 45deg at 50% 50%, #FFFDF6 0deg, rgba(250, 246, 233, 0.8) 90deg, #FAF6E9 180deg, rgba(245, 240, 220, 0.9) 270deg, #FFFDF6 360deg)',
    
    // Interactive state gradients
    hover: 'linear-gradient(135deg, rgba(160, 200, 120, 0.08) 0%, rgba(221, 235, 157, 0.12) 100%)',
    active: 'linear-gradient(135deg, rgba(160, 200, 120, 0.15) 0%, rgba(139, 181, 99, 0.2) 100%)',
    focus: 'linear-gradient(135deg, rgba(160, 200, 120, 0.1) 0%, rgba(221, 235, 157, 0.15) 100%)',
    
    // Semantic gradients with professional appeal
    success: 'linear-gradient(135deg, #28A745 0%, #34CE57 25%, #20C997 75%, #17A2B8 100%)',
    successSoft: 'linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(52, 206, 87, 0.08) 50%, rgba(32, 201, 151, 0.06) 100%)',
    error: 'linear-gradient(135deg, #DC3545 0%, #E74C3C 30%, #C0392B 70%, #A93226 100%)',
    errorSoft: 'linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(231, 76, 60, 0.08) 50%, rgba(169, 50, 38, 0.06) 100%)',
    warning: 'linear-gradient(135deg, #FFC107 0%, #FFD93D 25%, #F39C12 75%, #E67E22 100%)',
    warningSoft: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 217, 61, 0.08) 50%, rgba(230, 126, 34, 0.06) 100%)',
    info: 'linear-gradient(135deg, #17A2B8 0%, #3498DB 25%, #5DADE2 75%, #85C1E9 100%)',
    infoSoft: 'linear-gradient(135deg, rgba(23, 162, 184, 0.1) 0%, rgba(52, 152, 219, 0.08) 50%, rgba(133, 193, 233, 0.06) 100%)',
    
    // Sophisticated overlays and masks
    overlay: 'linear-gradient(135deg, rgba(26, 29, 32, 0.6) 0%, rgba(26, 29, 32, 0.4) 50%, rgba(26, 29, 32, 0.7) 100%)',
    overlayLight: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0.95) 100%)',
    shimmer: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.5) 50%, transparent 70%)',
    
    // Premium gradient combinations
    premium: 'linear-gradient(135deg, #A0C878 0%, rgba(160, 200, 120, 0.8) 20%, #DDEB9D 40%, rgba(221, 235, 157, 0.9) 60%, #F5F0DC 80%, rgba(245, 240, 220, 0.95) 100%)',
    luxury: 'conic-gradient(from 180deg at 50% 50%, #A0C878, #8BB563, #DDEB9D, #C4D675, #F5F0DC, #FDFBF0, #A0C878)',
    aurora: 'linear-gradient(45deg, rgba(160, 200, 120, 0.3) 0%, rgba(221, 235, 157, 0.2) 25%, rgba(245, 240, 220, 0.1) 50%, rgba(196, 214, 117, 0.2) 75%, rgba(139, 181, 99, 0.3) 100%)',
  },
  
  // Surface Colors - Layered Design
  surface: {
    background: '#FFFDF6',
    card: '#FFFFFF',
    cardElevated: '#F8F9FA',
    overlay: 'rgba(26, 29, 32, 0.5)',
    glass: 'rgba(255, 255, 255, 0.8)',
  }
} as const;

export type ColorPalette = typeof colors;