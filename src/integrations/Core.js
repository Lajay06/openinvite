import { base44 } from '@/api/base44Client';

// Proxy that forwards named exports (InvokeLLM, GenerateImage, UploadFile, …)
// to base44.integrations.Core, matching the behaviour of the Base44 vite-plugin
// compat shim that only activates when BASE44_LEGACY_SDK_IMPORTS=true.
export const InvokeLLM    = (...args) => base44.integrations.Core.InvokeLLM(...args);
export const GenerateImage = (...args) => base44.integrations.Core.GenerateImage(...args);
export const UploadFile    = (...args) => base44.integrations.Core.UploadFile(...args);
export const ExtractDataFromUploadedFile = (...args) => base44.integrations.Core.ExtractDataFromUploadedFile(...args);
export const SendEmail     = (...args) => base44.integrations.Core.SendEmail(...args);
