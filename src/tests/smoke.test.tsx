import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../app/App';

test('renders login', () => {
  window.history.pushState({}, '', '/login');

  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  expect(
    screen.getByRole('button', { name: /enviar código de acceso/i })
  ).toBeInTheDocument();
});
