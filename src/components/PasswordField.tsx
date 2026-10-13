import { InputHTMLAttributes, useId, useState } from 'react';
import SmartRhIcon from './SmartRhIcon';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

export default function PasswordField({ label, className, id, ...props }: Props) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-password-field">
      <label className="auth-label" htmlFor={inputId}>
        {label}
      </label>

      <div className="auth-password-control">
        <input
          {...props}
          id={inputId}
          className={`auth-input auth-password-input ${className || ''}`.trim()}
          type={visible ? 'text' : 'password'}
        />

        <button
          className="auth-password-eye"
          type="button"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setVisible((current) => !current)}
        >
          <SmartRhIcon name={visible ? 'eyeOff' : 'eye'} />
        </button>
      </div>
    </div>
  );
}
