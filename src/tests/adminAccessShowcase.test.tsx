import React from 'react';
import {jest} from '@jest/globals';
import {api} from '../services/api';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {AuthProvider} from '../app/auth/AuthContext';
import AdminAccess from '../modules/dashboard/AdminAccess';
import AdminLogin from '../modules/dashboard/AdminLogin';
import VerifyLoginCode from '../modules/dashboard/VerifyLoginCode';
afterEach(()=>{cleanup();localStorage.clear();jest.restoreAllMocks();});
function showcase(Component:React.ComponentType,state:any={}) {
 const {container}=render(<MemoryRouter initialEntries={[{pathname:'/',state}]}><AuthProvider><Component/></AuthProvider></MemoryRouter>);
 expect(container.querySelector('.auth-page-admin-access')).toBeInTheDocument();
 return container.querySelector('.auth-showcase-card')!.outerHTML;
}
it('keeps the exact same left card through request, account and administrator verification',()=>{
 const request=showcase(AdminAccess);expect(screen.getByText('Acceso administrativo protegido')).toBeInTheDocument();cleanup();
 const account=showcase(AdminLogin,{adminAccessToken:'test-only-authorization'});expect(screen.getByRole('heading',{name:'Identifica tu cuenta'})).toBeInTheDocument();expect(account).toBe(request);cleanup();
 const verify=showcase(VerifyLoginCode,{correo:'admin@example.invalid',challengeId:'test-only-challenge',adminFlow:true});expect(verify).toBe(request);expect(screen.getByText('admin@example.invalid')).toBeInTheDocument();
});

it('keeps the approved card through the actual password-to-code navigation',async()=>{
 const post=jest.spyOn(api,'post').mockResolvedValue({data:{ok:true,requires2FA:true,challengeId:'a'.repeat(64),correo:'admin@example.invalid'}});
 const {container}=render(<MemoryRouter initialEntries={[{pathname:'/admin/login',state:{adminAccessToken:'test-only-authorization'}}]}><AuthProvider><Routes><Route path="/admin/login" element={<AdminLogin/>}/><Route path="/verify-login-code" element={<VerifyLoginCode/>}/></Routes></AuthProvider></MemoryRouter>);
 const before=container.querySelector('.auth-showcase-card')!.outerHTML;
 fireEvent.change(screen.getByPlaceholderText('tu@empresa.com'),{target:{value:'admin@example.invalid'}});
 fireEvent.change(screen.getByLabelText('Contraseña'),{target:{value:'test-only-password'}});
 fireEvent.click(screen.getByRole('button',{name:/Continuar al código de seguridad/}));
 await screen.findByRole('heading',{name:/Confirma.*código/i});
 expect(container.querySelector('.auth-showcase-card')!.outerHTML).toBe(before);
 expect(container.querySelector('.auth-page-admin-access')).toBeInTheDocument();
 expect(container.querySelector('.auth-brand-block')).not.toBeInTheDocument();
 expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
 expect(screen.getByText('admin@example.invalid')).toBeInTheDocument();
 expect(post.mock.calls[0][0]).toBe('/auth/admin-login');
});
it('does not restore the legacy card when verification state lacks the presentation flag',()=>{
 const request=showcase(AdminAccess);cleanup();
 const verify=showcase(VerifyLoginCode,{correo:'admin@example.invalid',challengeId:'a'.repeat(64)});
 expect(verify).toBe(request);
});
