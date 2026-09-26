import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { Role } from '@saas/shared';
import {
  AuthLayout,
  AuthCard,
  FormField,
  FormLabel,
  Input,
  Button,
  Alert,
} from '../../components';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login({ email, password });
      if (res.user.role === Role.ADMIN) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      if (err.statusCode === 403 || err.message?.includes('suspended')) {
        sessionStorage.setItem('suspended_email', email);
        navigate('/account-suspended', { replace: true });
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to your SaaS account"
        footer={
          <div>
            <span>Don't have an account? </span>
            <Link to="/register" id="to-register-link">
              Create account
            </Link>
          </div>
        }
      >
        {error && (
          <Alert variant="error" id="login-error-alert">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} id="login-form">
          <FormField>
            <FormLabel htmlFor="email" required>
              Email address
            </FormLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="password" required>
              Password
            </FormLabel>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
            id="login-submit-btn"
          >
            Sign In
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
};
