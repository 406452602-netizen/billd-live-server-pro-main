import sysLanguageModel from '@/model/sysLanguage.model';
import sysTranslationsDict from '@/model/sysTranslationsDict.model';

class SysLanguageService {
  /** 根据语言码code查询对应数据字典 */
  async findDict(code: string) {
    const result = await sysTranslationsDict.findAndCountAll({
      where: { lg_code: code },
    });
    return result;
  }

  /** 获取所有语言内容 */
  async getList() {
    // eslint-disable-next-line no-return-await
    return await sysLanguageModel.findAndCountAll({
      where: { is_active: true },
    });
  }
}

export default new SysLanguageService();
