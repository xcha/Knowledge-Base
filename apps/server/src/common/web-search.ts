import * as cheerio from 'cheerio';
import { Logger } from '@nestjs/common';

const logger = new Logger('WebSearch');

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

/**
 * 搜狗搜索（服务端渲染，适合爬取）
 */
async function searchSogou(
  query: string,
  maxResults = 5,
): Promise<SearchResult[]> {
  const url = `https://www.sogou.com/web?query=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
    redirect: 'follow',
  });

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  // 搜狗搜索结果选择器
  $(
    'div.results div.vrwrap, div.results div.rb, div#main div.results > div',
  ).each((_, el) => {
    if (results.length >= maxResults) return false;

    const titleEl = $(el).find('h3 a').first();
    const title = titleEl.text().trim();
    const href = titleEl.attr('href') || '';

    // 搜狗摘要选择器
    const descEl = $(el).find(
      'p.str_info, p.str-text, .star-wiki, .str_info, div.space-txt, div.str-text, p[class*="str"]',
    );
    let description = descEl.text().trim().slice(0, 200);

    // 备选：取所有段落文本
    if (!description) {
      description = $(el).find('p').first().text().trim().slice(0, 200);
    }

    if (title && title.length > 3) {
      results.push({ title, url: href, description: description || title });
    }
  });

  return results;
}

/**
 * Bing 国际版（备用）
 */
async function searchBing(
  query: string,
  maxResults = 5,
): Promise<SearchResult[]> {
  const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-CN`;

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
    redirect: 'follow',
  });

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  // Bing 搜索结果
  $('li.b_algo, ol#b_results li').each((_, el) => {
    if (results.length >= maxResults) return false;

    const titleEl = $(el).find('h2 a').first();
    const title = titleEl.text().trim();
    const href = titleEl.attr('href') || '';

    const descEl = $(el).find('p, .b_caption p');
    const description = descEl.first().text().trim().slice(0, 200);

    if (title && title.length > 3) {
      results.push({ title, url: href, description: description || title });
    }
  });

  return results;
}

/**
 * 搜索入口：搜狗优先，Bing 备用
 */
export async function webSearch(
  query: string,
  maxResults = 5,
): Promise<SearchResult[]> {
  logger.log(`搜索: ${query}`);

  // 搜狗优先
  try {
    const results = await searchSogou(query, maxResults);
    if (results.length > 0) {
      logger.log(`搜狗搜索结果: ${results.length} 条`);
      return results;
    }
  } catch (err) {
    logger.warn(`搜狗搜索失败: ${String(err)}`);
  }

  // Bing 备用
  try {
    const results = await searchBing(query, maxResults);
    if (results.length > 0) {
      logger.log(`Bing 搜索结果: ${results.length} 条`);
      return results;
    }
  } catch (err) {
    logger.warn(`Bing 搜索失败: ${String(err)}`);
  }

  logger.log('所有搜索引擎均无结果');
  return [];
}
