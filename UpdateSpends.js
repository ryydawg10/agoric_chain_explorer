//I assume I need to get historical data as well. I plan to add that later. It shouldn't be too hard. 
//These functions update redis every five minutes.

const https = require('http');
const client = require('./RedisClient');
let lastBlock;
let firstBlock;
let beg;
let end;
let fiveMinSpend = 0;


//get the most recent block at the start of the program.
https.get('http://65.109.34.121:36657/status?', (resp) => {
    let data = '';
  
    resp.on('data', (chunk) =>  {
      data += chunk;
    });
  
    resp.on('end', () => {
      //change below to json instead of searching the string.
        beg = data.indexOf("latest_block_height");
        end = data.indexOf('"',beg+22);
        firstBlock = data.substring(beg+22,end);;
        console.log(firstBlock);
    })
})

const fiveMinsMs = 300000; // Update redis every 5 minutes. 
setInterval(updateRedis, fiveMinsMs);

async function updateRedis() {
  lastBlock = await getLatestBlock();
  setTimeout(function() {},5000);//attempt to fix error message in block json.
    while(firstBlock<=lastBlock) //get spends for every block in the last 5 minutes.
    {
      await getSpend(firstBlock);
    } 
    storeSpend(fiveMinSpend);
    fiveMinSpend = 0;
}

function getSpend(block)
{
  return new Promise((resolve,reject) => {
  https.get('http://65.109.34.121:36657/block_results?height=' + (firstBlock), (res) => {
    let bData = "";
    res.on('data', (chunk)=>{
        bData += chunk;
    
    });
    res.on('end', () => {
        data = JSON.parse(bData);
        console.log(data);
        if(data.result.txs_results != null)
        {
          fiveMinSpend+=findSpends(data);
          console.log(fiveMinSpend);
        }
        firstBlock++
        resolve();
      })
    })
  })
}

function getLatestBlock()
{
  return new Promise((resolve,reject) => {
  https.get('http://65.109.34.121:36657/status?', (resp) => {
    let data = '';
  
    resp.on('data', (chunk) =>  {
      data += chunk;
    });
  
    resp.on('end', () => {
      //change below to json instead of searching the string.
      beg = data.indexOf("latest_block_height");
      end = data.indexOf('"',beg+22);
      latestBlock = data.substring(beg+22,end);
      resolve(latestBlock);
    })
  })
})
}


function findSpends(jsonBlock) //get spends for a block and decode from base64
{
  let attribute = jsonBlock.result.txs_results[0].events[0].attributes;
  let i = 0;
  let blockSpends = 0;
  while(attribute[i]!=undefined && i<=1)
  {
    let base64String = attribute[i].value;
    let decodedBuffer = Buffer.from(base64String, 'base64');
    let decodedString = decodedBuffer.toString('utf8');
    console.log(decodedString);
    if(i%2==1)
    {
      decodedString = decodedString.substring(0,decodedString.length - 4);
      decodedString = Number(decodedString);
      blockSpends+=decodedString;
      i++;
    }
    else
    {
      i++;
    }
  }
  return blockSpends;
}

async function storeSpend(amount,timeStamp) { //store spends in redis
  await client.zAdd('spend_data', {
      score: timeStamp,
      value: amount.toString()
  });
}
