import {presets,normalize,clone} from './core.js?v=20261003-16';
import {assertPlanMatches} from './planning-contract.js';

export const planSources={demo:'AI 制作示例 · 预置',model:'在线模型生成','local-rules':'本地规则草案',imported:'导入方案'};

// The workbench and full consumer page use one normalized product definition.
export function planToProduct(record){
  const p=assertPlanMatches(record.plan,record.brief),kind=p.category;
  if(kind==='other')throw new Error('对应产品模块尚未实现。');
  const cfg=clone(presets[kind==='lamp'?'product':kind]);
  cfg.idea=record.brief.goal;cfg.audience=record.brief.audience||cfg.audience;
  cfg.name=record.brief.product+' · 产品体验';cfg.outcome=record.brief.goal;
  cfg.branding.title=p.headline;cfg.branding.tagline=p.tagline;
  if(record.implementationOptions){cfg.product.features.finish=record.implementationOptions.finish;cfg.product.features.structure=record.implementationOptions.structure;}
  if(kind==='headphones'&&record.previewSelection?.selection?.kind==='headphones'){
    const {selection:s,observation:o}=record.previewSelection;
    cfg.product.initial={color:s.color,finish:s.finish,explode:s.structurePercent};
    cfg.headphones.initial={fold:s.foldPercent,view:s.view,environment:s.environment,camera:o?{yaw:o.yaw,pitch:o.pitch,zoom:o.zoom,focus:o.focus}:null};
  }
  cfg.experiencePlan=p;
  cfg.experiencePlanSource=(planSources[record.provider]||'导入方案')+(record.revisions?.length?' · 已调整':'');
  return normalize(cfg);
}
