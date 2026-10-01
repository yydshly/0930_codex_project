import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve('projects/002-huashu-design');
process.env.RUNTIME_NODE_MODULES=process.env.HUASHU_NODE_MODULES || 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const skill='D:/codex/home/plugins/cache/openai-primary-runtime/presentations/26.921.10847/skills/presentations';
const {finalizePresentation}=await import(pathToFileURL(skill+'/container_tools/artifact_tool_utils.mjs').href);
const candidatePath=root+'/web/cases/research-desk/downloads/research-desk.pptx';
const finalPath=root+'/build/case/final/validated.pptx';
await fs.mkdir(path.dirname(finalPath),{recursive:true});
const result=await finalizePresentation({workspaceDir:root,candidatePath,finalPath,pythonExecutable:'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],fontPolicy:{basis:'design',families:['Microsoft YaHei']},requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],verifyArtifactToolImport:true,receiptPath:root+'/build/case/pptx.validation.json'});
console.log(JSON.stringify(result));
// Only replace with the validated file if it preserves the upstream artifact bytes.
const before=await fs.readFile(candidatePath),after=await fs.readFile(finalPath);
if(!before.equals(after))throw Error('Finalizer changed artifact bytes; review required.');
console.log('Validated file bytes match the normalized candidate.');
