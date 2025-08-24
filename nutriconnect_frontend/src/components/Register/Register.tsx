import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Register.css';

interface RegisterForm {
  uin: string;
  name: string;
  phone: string;
  email: string;
  confirmPhone: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterForm>({
    uin: '',
    name: '',
    phone: '',
    email: '',
    confirmPhone: '',
  });
  
  const [errors, setErrors] = useState<Partial<RegisterForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterForm> = {};

    if (!formData.uin.trim()) {
      newErrors.uin = 'UIN is required';
    } else if (!/^UIN\d{3,}$/i.test(formData.uin)) {
      newErrors.uin = 'UIN must be in format UIN001, UIN002, etc.';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.phone !== formData.confirmPhone) {
      newErrors.confirmPhone = 'Phone numbers do not match';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Simulate registration API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccessMessage(
        'Registration request submitted successfully! ' +
        'You will receive a confirmation once your account is approved. ' +
        'This may take 1-2 business days.'
      );
      
      // Clear form
      setFormData({
        uin: '',
        name: '',
        phone: '',
        email: '',
        confirmPhone: '',
      });
      
    } catch (error) {
      setErrors({ uin: 'Registration failed. Please try again later.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RegisterForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear success message when form is modified
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  return (
    <div className="register-container">
      <div className="register-wrapper">
        <div className="register-card card">
          <div className="register-header">
            <div className="logo">
              <h1>NutriConnect</h1>
              <p>Smart School Meals & Subsidy System</p>
            </div>
          </div>

          <div className="register-content">
            <h2>Create Your Account</h2>
            <p className="register-subtitle">
              Register to access school meal services and subsidies
            </p>

            {successMessage && (
              <div className="form-success">
                <span>✅</span>
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="register-form fade-in">
              <div className="form-group">
                <label htmlFor="uin" className="form-label">
                  UIN (User Identification Number) *
                </label>
                <input
                  type="text"
                  id="uin"
                  className="form-input"
                  placeholder="Enter your UIN (e.g., UIN001)"
                  value={formData.uin}
                  onChange={handleInputChange('uin')}
                  disabled={isSubmitting}
                  autoComplete="username"
                  required
                />
                {errors.uin && (
                  <div className="form-error">
                    <span>⚠️</span>
                    {errors.uin}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  className="form-input"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  disabled={isSubmitting}
                  autoComplete="name"
                  required
                />
                {errors.name && (
                  <div className="form-error">
                    <span>⚠️</span>
                    {errors.name}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  className="form-input"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  disabled={isSubmitting}
                  autoComplete="tel"
                  required
                />
                {errors.phone && (
                  <div className="form-error">
                    <span>⚠️</span>
                    {errors.phone}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPhone" className="form-label">
                  Confirm Phone Number *
                </label>
                <input
                  type="tel"
                  id="confirmPhone"
                  className="form-input"
                  placeholder="Re-enter your phone number"
                  value={formData.confirmPhone}
                  onChange={handleInputChange('confirmPhone')}
                  disabled={isSubmitting}
                  autoComplete="tel"
                  required
                />
                {errors.confirmPhone && (
                  <div className="form-error">
                    <span>⚠️</span>
                    {errors.confirmPhone}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  disabled={isSubmitting}
                  autoComplete="email"
                  required
                />
                {errors.email && (
                  <div className="form-error">
                    <span>⚠️</span>
                    {errors.email}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading"></span>
                    Submitting...
                  </>
                ) : (
                  'Register'
                )}
              </button>

              <div className="register-help">
                <p>Already have an account? <Link to="/login" >Sign in here</Link></p>
                <p className="text-muted">
                  * All fields are required. Your account will be reviewed before activation.
                </p>
              </div>
            </form>
          </div>
        </div>

        <div className="register-benefits">
          <div className="benefit-card">
            <div className="benefit-icon">🍽️</div>
            <h4>Smart Meal Planning</h4>
            <p>Access daily menus with nutritional information and dietary preferences</p>
          </div>
          
          <div className="benefit-card">
            <div className="benefit-icon">💰</div>
            <h4>Subsidy Management</h4>
            <p>Seamlessly manage meal subsidies and track your balance</p>
          </div>
          
          <div className="benefit-card">
            <div className="benefit-icon">👨‍👩‍👧‍👦</div>
            <h4>Family Support</h4>
            <p>Order meals for your children and manage family dietary needs</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;