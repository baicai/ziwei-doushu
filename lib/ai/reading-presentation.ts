/** Keeps the first complete idea visible; feedback reveals the remaining reading. */
export function splitReadingForFeedback(raw:string):{lead:string;details:string}{
  const text=raw.replace(/\r\n?/g,'\n').trim();
  if(!text)return {lead:'',details:''};
  // DeepSeek is asked to start with a concrete, complete sentence.
  const sentence=text.match(/^([\s\S]{2,200}?[。！？!?](?:[”"’']?))/);
  if(sentence){
    const lead=sentence[1].trim();
    return {lead,details:text.slice(sentence[1].length).trim()};
  }
  const firstBreak=text.indexOf('\n');
  if(firstBreak>10 && firstBreak<=220)
    return {lead:text.slice(0,firstBreak).trim(),details:text.slice(firstBreak+1).trim()};
  // Avoid arbitrarily cutting a sentence. Long/unclear text remains readable.
  return {lead:text,details:''};
}
