// PDF de una página generado sin servicios externos. Solo datos ficticios.
export function samplePdf(title:string,lines:string[]) {
 const ascii=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ').replace(/[\\()]/g,'\\$&');
 const stream=['BT /F1 20 Tf 50 780 Td ('+ascii('SMART RH - '+title)+') Tj /F1 11 Tf',...['DOCUMENTO DE DEMOSTRACION - SIN VALIDEZ LABORAL',...lines,'Datos ficticios. No corresponde a una persona real.'].map(t=>'0 -30 Td ('+ascii(t)+') Tj'),'ET'].join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];
 let body='%PDF-1.4\n';const offsets=[0];objects.forEach((o,i)=>{offsets.push(body.length);body+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});const xref=body.length;body+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return new Blob([body],{type:'application/pdf'});
}
export function downloadSample(title:string,lines:string[]) {const url=URL.createObjectURL(samplePdf(title,lines));const a=document.createElement('a');a.href=url;a.download='SMART_RH_DEMO_'+title.replace(/\W/g,'_')+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
