import React, { useState } from 'react';
import { UserDto, UpdateProfileDto } from '@saas/shared';
import { FormField } from '../FormField/FormField';
import { FormLabel } from '../FormLabel/FormLabel';
import { FormMessage } from '../FormMessage/FormMessage';
import { Input } from '../Input/Input';
import { Button } from '../Button/Button';
import { Alert } from '../Alert/Alert';
import './ProfileForm.scss';

export interface ProfileFormProps {
  user: UserDto;
  onSubmit: (data: UpdateProfileDto) => Promise<void>;
  isLoading?: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  user,
  onSubmit,
  isLoading = false,
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      await onSubmit({ name: name.trim(), email: email.trim() });
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to update profile');
    }
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit} id="profile-form">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <FormField>
        <FormLabel htmlFor="profile-name" required>Full Name</FormLabel>
        <Input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          disabled={isLoading}
          required
        />
      </FormField>

      <FormField>
        <FormLabel htmlFor="profile-email" required>Email Address</FormLabel>
        <Input
          id="profile-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          disabled={isLoading}
          required
        />
      </FormField>

      <FormField>
        <FormLabel htmlFor="profile-role">Account Role</FormLabel>
        <Input
          id="profile-role"
          type="text"
          value={user.role}
          disabled
          readOnly
        />
        <FormMessage variant="hint">Role cannot be modified directly.</FormMessage>
      </FormField>

      <div className="profile-form__actions">
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          id="save-profile-btn"
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};
