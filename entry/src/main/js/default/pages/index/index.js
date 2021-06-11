import fetch from '@system.fetch';
import storage from '@system.storage';

const FUND_INDEX_API = 'https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f13,f14&secids=1.000001,1.000300,0.399001,0.399006&_=1615516863425';
export default {
    data: {
        refreshing: true,
        fundIndexList: [],      // 大盘指数
        fundList: [],       // 自选的数据
        hasSync: true,     // 是否同步
    },
    loadFundIndex() {       // 获取大盘指数
        this.refreshing = true
        fetch.fetch({
            url: FUND_INDEX_API,
            responseType: "json",
            success: response => {
                console.info(`==== response => ${response}`)
                if (response.code !== 200) {
                    this.refreshing = false
                    return
                }
                const data = JSON.parse(response.data)
                const fundIndexList = data.data.diff
                this.refreshing = false
                this.fundIndexList = fundIndexList || []
            },
            fail: err => {
                console.info(`fetch fail, ${err}`);
                this.refreshing = false
            }
        });
    },
    onInit() {
        this.loadFundIndex()
        setTimeout(() => {
            this.initData()
        }, 5000);
        this.getX2rrFundsData('verygoodbye', 'xnj19940609')
    },
    onRefresh() {
        if (this.refreshing) {
            return
        } else {
            this.loadFundIndex()
            this.initData()
        }
    },
    async initData() {
        let x2rrFundList = await this.getStorage('x2rrFundList');
        console.info(`==== x2rrFundList => ${x2rrFundList}`)
        if (!x2rrFundList) {
            return
        }

        x2rrFundList = JSON.parse(x2rrFundList)
        const fundCodeList = x2rrFundList.map(v => v.code)
        const fundInfoList = await this.getFundInfo(fundCodeList)
        let dayIncome = 0
        let totalMoney = 0
        x2rrFundList = x2rrFundList.map(v => {
            const fund = fundInfoList.find(k => k['FCODE'] == v.code)
            v = { ...v, ...fund }
            v['CYJE'] = (v.num * v.NAV).toFixed(2) // 持有金额
            v['GSSY'] = ((v.CYJE * v.GSZZL) / 100).toFixed(2) // 估算收益
            //            v['GZTIME'] = dayjs(v.GZTIME).format('HH:mm')
            dayIncome += Number(v.GSSY)
            totalMoney += Number(v.CYJE)
            return v
        })
        this.fundList = x2rrFundList
//        this.dayIncome = dayIncome.toFixed(2)
        const dayIncomePercent = ((dayIncome / totalMoney) * 100).toFixed(2)
//        this.dayIncomePercent = dayIncomePercent
        this.hasSync = true
    },
    // 同步浏览器接口数据
    getX2rrFundsData(username, password) {
        return new Promise((resovle, reject) => {
            fetch.fetch({
                method: 'POST',
                url: 'https://2955b122-0e37-42a7-a4ee-4ddd503fe6b6.bspapp.com/http/user-center',
                data: {
                    action: 'login',
                    params: {
                        username: username,
                        password: password
                    }
                },
                responseType: "json",
                success: response => {
                    console.info(`==== 同步浏览器接口数据 response => ${response}`)
                    if (response.code !== 200) {
                        resovle({ err: 'error', fundList: null })
                    }
                    const data = JSON.parse(response.data)
                    const fundConfig = JSON.parse(data.userInfo.config_data)
                    const fundList = fundConfig.fundListM
                    this.setStorage('x2rrFundList', JSON.stringify(fundList))
                    this.hasSync = true
                    resovle({ err: null, fundList: fundList })
                },
                fail: err => {
                    console.info(`fetch fail, ${err}`);
                    reject(err)
                }
            });
        })
    },
    // 获取基金信息
    getFundInfo(fundCodeList) {
        return new Promise((resolve, reject) => {
            const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=c6a12d28-1e46-46df-bd62-d543d600b464&Fcodes=${fundCodeList.join(',')}`
            fetch.fetch({
                url: url,
                responseType: "json",
                success: response => {
                    if (response.code !== 200) {
                        this.refreshing = false
                        return
                    }
                    const data = JSON.parse(response.data)
                    const fundInfoList = data.data.Datas || []
                    resolve(fundInfoList)
                },
                fail: err => {
                    console.info(`fetch fail, ${err}`);
                    reject(err)
                }
            });
        })
    },
    getStorage(key) {
        return new Promise((resolve, reject) => {
            storage.get({
                key: key,
                success: function (data) {
                    console.log('call storage.get success: ' + data);
                    resolve(data)
                },
                fail: function (data, code) {
                    console.log('call storage.get fail, code: ' + code + ', data: ' + data);
                    reject(data)
                }
            });
        })
    },
    setStorage(key, value) {
        return new Promise((resolve, reject) => {
            storage.set({
                key: key,
                value: value,
                success: function () {
                    console.log('call storage.set success.');
                },
                fail: function (data, code) {
                    console.log('call storage.set fail, code: ' + code + ', data: ' + data);
                    reject(data)
                },
            });
        })
    }
}
