import type { Metadata } from 'next';
import BlindSummaryWorkbench from '@/components/BlindSummaryWorkbench';

export const metadata:Metadata={
  title:'匿名盲评本地汇总 · 紫微研究',
  description:'仅在浏览器中导入匿名命盘对照结果，按明确度观察主观选择，不上传出生资料。',
  robots:{index:false,follow:false},
};
export default function BlindResultsPage(){
  return <main><BlindSummaryWorkbench/></main>;
}
