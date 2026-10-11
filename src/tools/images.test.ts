import {describe,it,expect,vi,beforeEach} from 'vitest';
import FormData from 'form-data';
const {upload}=vi.hoisted(()=>({upload:vi.fn()}));
vi.mock('../config/config.js',()=>({createGhostApi:()=>({images:{upload}})}));
import {uploadImage} from './images.js';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
describe('image upload integration boundary',()=>{
 beforeEach(()=>{upload.mockReset();upload.mockResolvedValue({url:'https://example.test/image.png',ref:'test'});});
 it('passes multipart data directly to Ghost and returns MCP text content',async()=>{
  const result=await uploadImage({file:image,ref:'test'});
  expect(upload).toHaveBeenCalledOnce();
  const form=upload.mock.calls[0][0];
  expect(form).toBeInstanceOf(FormData);
  expect(form.getBuffer().toString()).toContain('name="purpose"\r\n\r\nimage');
  expect(result).toEqual({content:[{type:'text',text:JSON.stringify({url:'https://example.test/image.png',ref:'test'})}]});
 });
 it('rejects files exceeding the decoded size limit before calling Ghost',async()=>{
  await expect(uploadImage({file:'data:image/png;base64,'+Buffer.alloc(2*1024*1024+1).toString('base64'),purpose:'image'})).rejects.toThrow('maximum limit');
  expect(upload).not.toHaveBeenCalled();
 });
});
