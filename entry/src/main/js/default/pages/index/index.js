import fetch from '@system.fetch';
const FUND_INDEX_API = 'https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f13,f14&secids=1.000001,1.000300,0.399001,0.399006&_=1615516863425';
export default {
    data: {
        refreshing: true,
        fundList: []
    },
    loadFundIndex() {
        this.refreshing = true
        fetch.fetch({
            url: FUND_INDEX_API,
            responseType: "json",
            success: response => {
                console.info(`====> response的值为: ${JSON.stringify(response)}`);
                if (response.code !== 200) {
                    this.refreshing = false
                    return
                }
                const data = JSON.parse(response.data)
                const fundIndexList = data.data.diff
                this.refreshing = false
                this.fundList = fundIndexList || []
            },
            fail: err => {
                console.info(`fetch fail, ${err}`);
                this.refreshing = false
            }
        });
    },
    onInit() {
        this.loadFundIndex()
    },
    onRefresh(){
        if (this.refreshing) {
            return
        } else {
            this.loadFundIndex()
        }
    }
}
