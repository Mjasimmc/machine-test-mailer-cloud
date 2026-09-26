import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import {
  AuthLayout,
  AuthCard,
  FormField,
  FormLabel,
  Input,
  Button,
  Alert,
} from '../../components';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ name, email, password });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Create your account"
        subtitle="Get started with our SaaS platform"
        footer={
          <div>
            <span>Already have an account? </span>
            <Link to="/login" id="to-login-link">
              Sign in
            </Link>
          </div>
        }
      >
        {error && (
          <Alert variant="error" id="register-error-alert">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} id="register-form">
          <FormField>
            <FormLabel htmlFor="register-name" required>
              Full name
            </FormLabel>
            <Input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              autoComplete="name"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="register-email" required>
              Email address
            </FormLabel>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="register-password" required>
              Password (min. 6 characters)
            </FormLabel>
            <Input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
            id="register-submit-btn"
          >
            Create Account
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
};
