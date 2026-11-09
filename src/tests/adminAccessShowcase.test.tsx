import React from 'react';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AuthProvider} from '../app/auth/AuthContext';
import AdminAccess from '../modules/dashboard/AdminAccess';
import AdminLogin from '../modules/dashboard/AdminLogin';
import VerifyLoginCode from '../modules/dashboard/VerifyLoginCode';
afterEach(()=>{cleanup();localStorage.clear();});
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
