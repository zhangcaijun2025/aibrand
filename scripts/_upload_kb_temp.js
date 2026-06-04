const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const SKILL_DIR = path.join(process.env.USERPROFILE, '.openclaw\\workspace\\skills\\ima\\ima-skill');
const CLIENT_ID = fs.readFileSync(path.join(process.env.USERPROFILE, '.config\\ima\\client_id'), 'utf8').trim();
const API_KEY = fs.readFileSync(path.join(process.env.USERPROFILE, '.config\\ima\\api_key'), 'utf8').trim();
const KB_ID = 'zaYaEAaKd1SW8VMnkHEJBYs87D3rN5osIntuadk3Rdc=';
const FILE_PATH = 'C:/Users/XIAOMI/Desktop/AiBrand-项目全周期沟通纪要.md';
const FILE_NAME = 'AiBrand-项目全周期沟通纪要.md';
const FILE_SIZE = fs.statSync(FILE_PATH).size;

const IMA_API = path.join(SKILL_DIR, 'ima_api.cjs');

// Build args as array to avoid shell quoting nightmare
function callApi(apiPath, body) {
  const bodyStr = JSON.stringify(body);
  const optsStr = JSON.stringify({ clientId: CLIENT_ID, apiKey: API_KEY });
  
  const result = spawnSync('node', [IMA_API, apiPath, bodyStr, optsStr], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 60000
  });
  
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error('stderr:', result.stderr);
    throw new Error(`exit code ${result.status}: ${result.stderr}`);
  }
  
  return JSON.parse(result.stdout.trim());
}

try {
  // Step 1: check_repeated_names
  console.log('=== Step 1: check_repeated_names ===');
  const checkResp = callApi('openapi/wiki/v1/check_repeated_names', {
    params: [{ name: FILE_NAME, media_type: 7 }],
    knowledge_base_id: KB_ID
  });
  console.log('checkResp:', JSON.stringify(checkResp, null, 2));

  if (checkResp.code !== 0) {
    console.error('check_repeated_names failed:', checkResp.msg);
    process.exit(1);
  }

  const isRepeated = checkResp.data?.params?.[0]?.is_repeated;
  let finalName = FILE_NAME;
  if (isRepeated) {
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    finalName = `AiBrand-项目全周期沟通纪要_${ts}.md`;
    console.log(`⚠️ 文件名已存在，追加时间戳: ${finalName}`);
  }

  // Step 2: create_media
  console.log('\n=== Step 2: create_media ===');
  const createMediaResp = callApi('openapi/wiki/v1/create_media', {
    file_name: finalName,
    file_size: FILE_SIZE,
    content_type: 'text/markdown',
    knowledge_base_id: KB_ID,
    file_ext: 'md'
  });
  console.log('createMediaResp:', JSON.stringify(createMediaResp, null, 2));

  if (createMediaResp.code !== 0) {
    console.error('create_media failed:', createMediaResp.msg);
    process.exit(1);
  }

  const mediaData = createMediaResp.data;
  const mediaId = mediaData.media_id;
  const cosCred = mediaData.cos_credential;

  console.log('mediaId:', mediaId);

  // Step 3: COS Upload
  console.log('\n=== Step 3: COS Upload ===');
  const cosScript = path.join(SKILL_DIR, 'knowledge-base/scripts/cos-upload.cjs');
  
  const cosResult = spawnSync('node', [
    cosScript,
    '--file', FILE_PATH,
    '--secret-id', cosCred.secret_id,
    '--secret-key', cosCred.secret_key,
    '--token', cosCred.token,
    '--bucket', cosCred.bucket_name,
    '--region', cosCred.region,
    '--cos-key', cosCred.cos_key,
    '--content-type', 'text/markdown',
    '--start-time', String(cosCred.start_time),
    '--expired-time', String(cosCred.expired_time),
    '--timeout', '300000'
  ], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 300000
  });

  if (cosResult.error) throw cosResult.error;
  if (cosResult.status !== 0) {
    console.error('COS stderr:', cosResult.stderr);
    throw new Error(`COS upload failed with exit code ${cosResult.status}`);
  }
  console.log('COS stdout:', cosResult.stdout);

  // Step 4: add_knowledge
  console.log('\n=== Step 4: add_knowledge ===');
  const displayTitle = 'AiBrand 项目全周期沟通纪要';

  const addKnowledgeResp = callApi('openapi/wiki/v1/add_knowledge', {
    media_type: 7,
    media_id: mediaId,
    title: displayTitle,
    knowledge_base_id: KB_ID,
    file_info: {
      cos_key: cosCred.cos_key,
      file_size: FILE_SIZE,
      file_name: finalName
    }
  });
  console.log('addKnowledgeResp:', JSON.stringify(addKnowledgeResp, null, 2));

  if (addKnowledgeResp.code !== 0) {
    console.error('add_knowledge failed:', addKnowledgeResp.msg);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('✅ 上传成功！');
  console.log('========================================');
  console.log(`文件: ${FILE_NAME}`);
  console.log(`标题: ${displayTitle}`);
  console.log(`知识库: 灵感知识库`);
  console.log(`标签: AiBrand、全周期、架构演进、决策记录、自进化`);
  console.log('========================================');

} catch (e) {
  console.error('ERROR:', e.message);
  if (e.stderr) console.error('stderr:', e.stderr);
  if (e.stdout) console.error('stdout:', e.stdout);
  process.exit(1);
}
