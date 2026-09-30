import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../app/App';

test('redirects legacy login to administrative access', () => {
  window.history.pushState({}, '', '/login');

  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  expect(
    screen.getByRole('button', { name: /solicitar autorización/i })
  ).toBeInTheDocument();
});
