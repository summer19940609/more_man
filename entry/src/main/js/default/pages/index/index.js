import fetch from '@system.fetch';
import storage from '@system.storage';
import router from '@system.router';
import prompt from '@system.prompt'

const FUND_INDEX_API = 'https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f13,f14&secids=1.000001,1.000300,0.399001,0.399006&_=1615516863425';
export default {
    data: {
        refreshing: true,
        fundIndexList: [],      // 大盘指数
        fundList: [],       // 自选的数据
        hasSync: false,     // 是否同步
        account: '',        // 同步账号名
        password: '',        // 同步密码
        dayIncome: "",
        dayIncomePercent: ''
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
        this.initData()
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
        console.info(`==== 从storage里获取的 x2rrFundList => ${x2rrFundList}`)
        if (!x2rrFundList) {
            this.hasSync = false
            return
        }
        this.hasSync = true

        x2rrFundList = JSON.parse(x2rrFundList)
        const fundCodeList = x2rrFundList.map(v => v.code)
        const fundInfoList = await this.getFundInfo(fundCodeList).catch(err => {
            prompt.showToast({
                message: `获取基金数据失败`,
                duration: 3000,
            });
        })
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
        console.info(`==== 显示数据为 response => ${JSON.stringify(x2rrFundList)}`)
        this.dayIncome = this.toThousands(dayIncome.toFixed(2))
        console.info(`==== 显示数据 dayIncome 为  => ${dayIncome}`)
        const dayIncomePercent = ((dayIncome / totalMoney) * 100).toFixed(2)
        console.info(`==== 显示数据 dayIncomePercent 为  => ${dayIncomePercent}`)
        this.dayIncomePercent = dayIncomePercent
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
                    console.info(`==== 同步浏览器接口数据 response => ${JSON.stringify(response)}`)
                    const data = JSON.parse(response.data)
                    if (response.code !== 200 && data.code !== 0) {
                        console.info(`==== 同步浏览器接口数据出错啦 ${data.msg}`)
                        reject(JSON.stringify(response))
                    }
                    const fundConfig = JSON.parse(data.userInfo.config_data)
                    const fundList = fundConfig.fundListM
                    prompt.showToast({
                        message: `同步成功！`,
                        duration: 3000,
                    });
                    
                    console.info(`==== 同步返回数据 fundList => ${JSON.stringify(fundList)}`)
                    resovle(fundList)
                },
                fail: err => {
                    console.info(`==== fetch fail, ${err}`);
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
                    console.info(`==== 获取基金信息 response => ${JSON.stringify(response)}`)
                    if (response.code !== 200) {
                        this.refreshing = false
                        reject(JSON.stringify(response))
                    }
                    const data = JSON.parse(response.data)
                    const fundInfoList = data.Datas || []
                    console.info(`==== 获取基金信息 fundInfoList response => ${JSON.stringify(fundInfoList)}`) 
                    resolve(fundInfoList)
                },
                fail: err => {
                    console.info(`==== fetch fail, ${err}`);
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
                    resolve()
                },
                fail: function (data, code) {
                    console.info('==== call storage.set fail, code: ' + code + ', data: ' + data);
                    reject(data)
                },
            });
        })
    },
    goToSync() {
        this.$element('syncDialog').show()
    },
    inputAccount(e) {
        // if (e.value != null) {
        //     this.$element("accountInput").showError({
        //         error: '请输入账号'
        //     }); 
        //     return 
        // }
        this.account = e.value;
        // prompt.showToast({
        //     message: "account: " + e.value,
        //     duration: 2000,
        // });
    },
    inputPwd(e) {
        // if (e.value != null) {
        //     this.$element("pwdInput").showError({
        //         error: '请输入密码'
        //     }); 
        //     return 
        // }
        this.password = e.value;
        // prompt.showToast({
        //     message: "password: " + e.value,
        //     duration: 2000,
        // });
    },
    async sync() {
        console.info(`==== 点击开始同步`)
        console.info(`==== this.account => ${this.account}   this.password => ${this.password}`)
        const fundList = await this.getX2rrFundsData(this.account, this.password).catch(err => {
            console.info(`==== 同步基金信息错误 => ${err}`)
            prompt.showToast({
                message: `同步失败！${err}`,
                duration: 3000,
            });
        })
        await this.setStorage('x2rrFundList', JSON.stringify(fundList))
        await this.initData()
        this.hasSync = true
        this.$element('syncDialog').close()
    },
    goToPath() {
//        router.push({
//            uri: 'pages/news/news'
//        })
    },
    toThousands(num) {          // 千分位
        return num.replace(/\B(?=(\d{3})+(?!\d))/g,',')
    }
}
