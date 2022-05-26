const scraperObject = {
	url: 'https://www.tradevan.com.tw/news/index.do',
	async scraper(browser, recursivelyScrape){
		let page = await browser.newPage();
		console.log(`Navigating to ${this.url}...`);
		await page.goto(this.url);
    let scrapedData = [];
    async function scrapeCurrentPage(){
      // Wait for the required DOM to be rendered
		  await page.waitForSelector('.news_bg');
      // Get the link to all the required books
      let urls = await page.$$eval('.news_bg ul li:last-child', links => {
        // Make sure the book to be scraped is in stock
        // links = links.filter(link => link.querySelector('.instock.availability > i').textContent !== "In stock")
        // Extract the links from the data
        links = links.map(el => el.querySelector('a').href)
        return links;
      });
      // console.log(urls);
      // Loop through each of those links, open a new page instance and get the relevant data from them
      let pagePromise = (link) => new Promise(async(resolve, reject) => {
        let dataObj = {};
        let newPage = await browser.newPage();
        await newPage.goto(link);
        dataObj['date'] = await newPage.$eval('.news_info_date', text => text.textContent);
        dataObj['title'] = await newPage.$eval('.news_info_title', text => text.textContent);
        dataObj['slug'] = `/news/${dataObj['date']}-${dataObj['title']}`;
        if(await newPage.$('#main .info')){
          // 新格式
          dataObj['content'] = await newPage.$eval('#main .info', text => text.innerHTML.replace(/(\r\n\t|\n|\r|\t|\&nbsp;\s)/gm, "")
          );
          dataObj['content'] = dataObj['content'].replace(/"(data:image\/\w+;base64,.*)"/g, '""');

          if(await newPage.$('#main .info img')){
            // 新格式圖
            if(await newPage.$eval('#main .info img', img => !img.src.includes('base64'))){
              dataObj['imgs'] = await newPage.$$eval('#main .info img', imgs => {
                return imgs.map(img => img.src);
              });
            }
          }
        }else{
          // 舊格式
          dataObj['content'] = await newPage.$$eval('#info_right p', paragraphs => {
            paragraphs = paragraphs.map(el => el.innerHTML.replace(/(\r\n\t|\n|\r|\t|\&nbsp;\s)/gm, "")).join("");
            return paragraphs;
          });
          dataObj['content'] = dataObj['content'].replace('<a href="/index.do" target="_top">關貿網路</a> &gt; <a href="/index.do" target="_top">訊息公告</a> &gt; <a href="/index.do" target="_top">關貿新聞</a>', '');
          dataObj['content'] = dataObj['content'].replace('<a href="index.do" target="_top">回列表頁</a>', '');
          // 舊格式圖
          dataObj['imgs'] = await newPage.$$eval('#info_right p img', imgs => {
            return imgs.map(el => el.src);
          })
        }

        dataObj['category'] = 'news';
        // dataObj['noAvailable'] = await newPage.$eval('.instock.availability', text => {
          // Strip new line and tab spaces
          // text = text.textContent.replace(/(\r\n\t|\n|\r|\t)/gm, "");
          // Get the number of stock available
          // let regexp = /^.*\((.*)\).*$/i;
          // let stockAvailable = regexp.exec(text)[1].split(' ')[0];
          // return stockAvailable;
        // });
        // dataObj['imageUrl'] = await newPage.$eval('#product_gallery img', img => img.src);
        // dataObj['bookDescription'] = await newPage.$eval('#product_description', div => div.nextSibling.nextSibling.textContent);
        // dataObj['upc'] = await newPage.$eval('.table.table-striped > tbody > tr > td', table => table.textContent);
        resolve(dataObj);
        await newPage.close();
      });

      for(link in urls){
        let currentPageData = await pagePromise(urls[link]);
        console.log(currentPageData)
        scrapedData.push(currentPageData);
      }
      if(recursivelyScrape){
        let nextButtonExist = false;
        try{
          const nextButton = await page.$eval('.page > a:last-child', a => a.textContent);
          nextButtonExist = true;
        }
        catch(err){
          nextButtonExist = false;
        }
        if(nextButtonExist && scrapedData.length < 200){
          await page.click('.page > a:last-child');
          return scrapeCurrentPage(); // Call this function recursively
        }
      }
			await page.close();
			return scrapedData;
		}
		let data = await scrapeCurrentPage();
		console.log(data);
		return data;
	}
}

module.exports = scraperObject;