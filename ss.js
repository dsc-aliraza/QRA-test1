/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
/**
 * Module Description
 * 
 * Version	Date         Author           	Change/Issue #	Remarks
 * 1.00     16 Apr 20119 Ali Raza	         DSC  /IHD-10			Initial Version for pull the QRA numbers from external services and create cases using them 
 * 
 */
// var PROGRAM_ID = '1332'; //PB LOG  (commented out by Allan Berry 2nd May 2019)
// var CUSTOMER_ID = '94495' //Paintback Limited (commented out by Allan Berry 2nd May 2019)
var PROGRAM_ID = '1374'; //QR-APPLE (added out by Allan Berry 2nd May 2019)
var CUSTOMER_ID = '402256' //Quick Recycle (added out by Allan Berry 2nd May 2019)
var caseStatus = 1; //Open
var caseCreationMethod = 2; //Defaulted: Portal
var ORDER_TYPE_RETURN = '5';
var HC_ORDER_SOURCE_ONLINE = '3';
var QraGetAllIdDataUrl = "http://qr-stage1.ecoactiv.com.au/api/api/requests/trackingId?fromDate={DATE_FROM}&toDate={DATE_TO}";
var QraGetSingleIdDataUrl = "http://qr-stage1.ecoactiv.com.au/api/api/requests/search/"
define(['N/ui/serverWidget', 'N/runtime', 'N/log', 'N/http', "N/record", "N/search"],
    function (ui, runtime, log, https, record, search) {
        function onRequest(context) {
            try {

                var trackingIdsObj;
                var singleTrackingIdObj;
                trackingIdsObj = getAllTrackingIdsData();
                //   // added by ali 4-11-2019 start
                if (trackingIdsObj || trackingIdsObj.code && trackingIdsObj.code == 200) {
                    if (!isNullOrEmpty(trackingIdsObj.data)) {
                        var trackingIds = trackingIdsObj.data.split(",");
                        var qraExistingIds = getQraExistingIds(trackingIds);
                        log.debug('qraExistingIds: ', JSON.stringify(qraExistingIds));
                        log.debug("onRequest() :: Tracking Ids length: ", trackingIds.length);
                        for (var i = 0; i < trackingIds.length; i++) {
                            if (trackingIds[i] != "") {
                                var isIndex = '';
                                singleTrackingIdObj = getSingleTrackingIdData(trackingIds[i]);                              
                                var oJSON = prepareJSON(singleTrackingIdObj);
                                log.debug('oJSON: ', JSON.stringify(oJSON));
                                log.debug('oJSON:: case Items ', JSON.stringify(oJSON.CTsItemsArrays[0].CTItems));  //  addede by ali
                              
                                if (qraExistingIds) {

                                    var isIndex = qraExistingIds.indexOf(trackingIds[i]);
                                    log.debug('isIndex: ', isIndex);
                                }
                                 if (isIndex == -1) {
                                    createCase(oJSON, trackingIds[i]);
                               }
                            }
                        }

                    } else {
                        log.error("onRequest():: Get All Tracking Ids Data: ", "there is no ID in response");
                    }
                } else if (trackingIdsObj && trackingIdsObj.code && trackingIdsObj.code != 200) {
                    log.error("onRequest():: Get All Tracking Ids Data: ", trackingIdsObj.code + "::" + trackingIdsObj.body);

                } else {
                    // log.error("onRequest():: Get All Tracking Ids Data: ", 'The host you are trying to connect to is not responding.');
                }
                // added by ali 4-11-2019 end
            } catch (e) {
                log.error({
                    title: 'onRequest() :: Error Message',
                    details: e.message
                });
            }

        }

        function getAllTrackingIdsData() {
            var url;
            try {
               //var date = getYesterdaysDate();
                //log.debug("getYesterdaysDate: ", date);
                //date = date.split('/');
                //var dateFrom = new Date(date[2], date[1] - 1, date[0], 0 - 7, 1, 0, 0).getTime() / 1000;
                //var dateTo = new Date(date[2], date[1] - 1, date[0], 23 - 7, 59, 0, 0).getTime() / 1000;

                //  changed by ali start  10-4-2019
                var nowDate = (new Date().getTime()/1000).toFixed(0);
                var dateTo = nowDate; // adding a minute to overlap time
                var dateFrom = nowDate - 86400; // adding a minute to overlap time

                // var year = nowDate.getFullYear()
                // var month = nowDate.getMonth();
                // var day = nowDate.getDate();
                // if (day == 1 && month == 1) {
                //     year -= 1;
                //     month = month + 10;
                // } else if (day == 1 && month != 1) {
                //     month -= 1;
                // } else {}
                // var dateFrom = new Date(year, month, (day - 1), 23, 59, 0, 0).getTime() / 1000;
                // //  changed by ali end 10-4-2019
                log.debug("dateFrom: ", dateFrom);
                //  changed by ali start
                // var nowDate = new Date();
                // var year = nowDate.getFullYear();
                // var month = nowDate.getMonth();
                // var day = nowDate.getDate();
                // var dateTo = new Date(year, month, day, 0, 0, 0, 0).getTime() / 1000;
                // // changed by ali end
                // log.debug("dateTo: ", new Date(year, month, day, 0, 0, 0, 0));
                log.debug("dateTo: ", dateTo);
                url = QraGetAllIdDataUrl.replace("{DATE_FROM}", dateFrom); 
              // added timeto and from staticly for test added by ali IHD-36 (time)
             // url = QraGetAllIdDataUrl.replace("{DATE_FROM}", 1557102068); 
             // url = url.replace("{DATE_TO}", 1557188468);
                url = url.replace("{DATE_TO}", dateTo);
                url = url.replace("{STATUS_ID}", 2);
                log.debug("URL: ", url);
                var data = requestData(url);
                log.debug("URLerror: ", data);
                return data;
            } catch (e) {
                log.error({
                    title: 'getAllTrackingIdsData() :: Error Message',
                    details: e.message
                });
            }
            return;
        }

        function getSingleTrackingIdData(id) {
            try {
                url = QraGetSingleIdDataUrl + id;
                data = requestData(url);
                return data;

            } catch (e) {
                log.error({
                    title: 'getSingleTrackingIdData() :: Error Message',
                    details: e.message
                });
                return;
            }
        }

        function requestData(url) {
            //   var header = {
            //       "x-app-client-token": "a066cafcd7764f9d5dfbd08c5ae23873"
            //    };

            var response = https.get({
                url: url,
                //  headers: header
            });
            // added by ali start 4-11-2019

            if (response.code && response.code != 200) {
                log.error("requestData() :: Response body for request: ", response.code + "::" + response.body);

                return response;
            } else if (response == "") {
                log.error("requestData() :: Response body for request: ", 'The host you are trying to connect to is not responding.');
                return "";
            } else {
                var data = JSON.parse(response.body);
                log.debug({
                    title: 'getAllTrackingIdsData() :: Response Data:',
                    details: JSON.stringify(data)
                });
                return data;
                // added by ali end 4-11-2019
            }
        }

        function prepareJSON(singleTrackingIdObj) {
            try {
                var aItem = new Array();
                var oJSON = {};
                //prepare contact
                // added by ali start

                var oContact = {};
                // mapping for case and CT
                // new fields mapping for case start
                // added by ali start 25-3-19 prepare json comment for CT fields
                //added by ali start IHD-36
                oContact.homeTechCode = !isNullOrEmpty(singleTrackingIdObj.homeTechCode) ? singleTrackingIdObj.homeTechCode : '';
                 //added by ali end IHD-36
                var commentJsonCT = {};
                oContact.sectionId = !isNullOrEmpty(singleTrackingIdObj.sectionId) ? singleTrackingIdObj.sectionId : '';
                commentJsonCT.location = !isNullOrEmpty(singleTrackingIdObj.location) ? singleTrackingIdObj.location : '';
                commentJsonCT.latitude = !isNullOrEmpty(singleTrackingIdObj.latitude) ? singleTrackingIdObj.latitude : '';
                commentJsonCT.longtitude = !isNullOrEmpty(singleTrackingIdObj.longtitude) ? singleTrackingIdObj.longtitude : '';
                commentJsonCT.addressTypeId = !isNullOrEmpty(singleTrackingIdObj.addressTypeId) ? singleTrackingIdObj.addressTypeId : '';
                oContact.jsonCommentCT = commentJsonCT;
                // added by ali end 25-3-19 prepare json comment for CT fields
                oContact.supportexecutivecode = !isNullOrEmpty(singleTrackingIdObj.supportexecutivecode) ? singleTrackingIdObj.supportexecutivecode : '';
                oContact.enterpriseeducation = !isNullOrEmpty(singleTrackingIdObj.isEnterpriseOrEducation) ? singleTrackingIdObj.isEnterpriseOrEducation : false;  // changed by ali IHD-36
                oContact.packagingrequired = !isNullOrEmpty(singleTrackingIdObj.isOnsitePackagingRequired) ? singleTrackingIdObj.isOnsitePackagingRequired : false; // changed by ali IHD-36
                // added by ali start IHD-36
                oContact.totalCost = !isNullOrEmpty(singleTrackingIdObj.totalCost) ? singleTrackingIdObj.totalCost : 0;
                oContact.consumerCost = !isNullOrEmpty(singleTrackingIdObj.consumerCost) ? singleTrackingIdObj.consumerCost : 0;
                oContact.packageCost = !isNullOrEmpty(singleTrackingIdObj.packageCost) ? singleTrackingIdObj.packageCost : 0;
                oContact.customerCost = !isNullOrEmpty(singleTrackingIdObj.customerCost) ? singleTrackingIdObj.customerCost : 0;
                oContact.serviceCost = !isNullOrEmpty(singleTrackingIdObj.serviceCost) ? singleTrackingIdObj.serviceCost : 0;
                // added by ali end IHD-36

                // new fields mapping for case end

                // new fields mapping for CT start

                oContact.ctestimatednumofsatchels = !isNullOrEmpty(singleTrackingIdObj.ctestimatednumofsatchels) ? singleTrackingIdObj.ctestimatednumofsatchels : '';
                oContact.estimatednumberboxes = !isNullOrEmpty(singleTrackingIdObj.estimatednumberboxes) ? singleTrackingIdObj.estimatednumberboxes : '';
                oContact.estimatednumberfreestand = !isNullOrEmpty(singleTrackingIdObj.estimatednumberfreestand) ? singleTrackingIdObj.estimatednumberfreestand : '';
                oContact.estimatednumberofpallets = !isNullOrEmpty(singleTrackingIdObj.estimatednumberofpallets) ? singleTrackingIdObj.estimatednumberofpallets : '';
                oContact.confirmednumberofsatchels = !isNullOrEmpty(singleTrackingIdObj.confirmednumberofsatchels) ? singleTrackingIdObj.confirmednumberofsatchels : '';
                oContact.confirmednumberofboxes = !isNullOrEmpty(singleTrackingIdObj.confirmednumberofboxes) ? singleTrackingIdObj.confirmednumberofboxes : '';
                oContact.confirmednumberfreestand = !isNullOrEmpty(singleTrackingIdObj.confirmednumberfreestand) ? singleTrackingIdObj.confirmednumberfreestand : '';
                oContact.confirmednumberofpallets = !isNullOrEmpty(singleTrackingIdObj.confirmednumberofpallets) ? singleTrackingIdObj.confirmednumberofpallets : '';
                // new fields mapping for CT end
                // pending fields mapping for CT start

                oContact.sectionId = !isNullOrEmpty(singleTrackingIdObj.sectionId) ? singleTrackingIdObj.sectionId : '';
                oContact.conNote = !isNullOrEmpty(singleTrackingIdObj.conNote) ? singleTrackingIdObj.conNote : '';
                oContact.pickupDate = !isNullOrEmpty(singleTrackingIdObj.pickupDate) ? singleTrackingIdObj.pickupDate : ''; // ommited space
                oContact.transportSupplier = !isNullOrEmpty(singleTrackingIdObj.transportSupplier) ? singleTrackingIdObj.transportSupplier : ''; // ommited space
                oContact.transportServiceLevelName = !isNullOrEmpty(singleTrackingIdObj.transportServiceLevelName) ? singleTrackingIdObj.transportServiceLevelName : ''; // ommited space 
                oContact.recyclingSupplier = !isNullOrEmpty(singleTrackingIdObj.recyclingSupplier) ? singleTrackingIdObj.recyclingSupplier : ''; // ommited space
                //    oContact.destinationdetailsMultipleFields=!isNullOrEmpty(singleTrackingIdObj.destinationdetailsMultipleFields)  ? singleTrackingIdObj.destinationdetailsMultipleFields : '';  // ommited space id not exist
                oContact.pickupInstructions = !isNullOrEmpty(singleTrackingIdObj.pickupInstructions) ? singleTrackingIdObj.pickupInstructions : ''; // ommited space
                oContact.pickupTimeFrom = !isNullOrEmpty(singleTrackingIdObj.pickupTimeFrom) ? singleTrackingIdObj.pickupTimeFrom : ''; // ommited space
                oContact.pickupTimeTo = !isNullOrEmpty(singleTrackingIdObj.pickupTimeTo) ? singleTrackingIdObj.pickupTimeTo : ''; // ommited space
                oContact.comments = !isNullOrEmpty(singleTrackingIdObj.comments) ? singleTrackingIdObj.comments : '';
                oContact.logisitcsDirection = !isNullOrEmpty(singleTrackingIdObj.logisitcsDirection) ? singleTrackingIdObj.logisitcsDirection : ''; // ommited space
                oContact.customerEstimateWeight = !isNullOrEmpty(singleTrackingIdObj.customerEstimateWeight) ? singleTrackingIdObj.customerEstimateWeight : ''; // ommited space
                oContact.IADeclaredWeight = !isNullOrEmpty(singleTrackingIdObj.IADeclaredWeight) ? singleTrackingIdObj.IADeclaredWeight : ''; // ommited space
                oContact.estimatedFreightCharge = !isNullOrEmpty(singleTrackingIdObj.estimatedFreightCharge) ? singleTrackingIdObj.estimatedFreightCharge : ''; // ommited space
                oContact.estimatedFuelLevyCharge = !isNullOrEmpty(singleTrackingIdObj.estimatedFuelLevyCharge) ? singleTrackingIdObj.estimatedFuelLevyCharge : ''; // ommited space
                oContact.estimatedAdditionalFees = !isNullOrEmpty(singleTrackingIdObj.estimatedAdditionalFees) ? singleTrackingIdObj.estimatedAdditionalFees : ''; // ommited space
                oContact.totalEstimatedCost = !isNullOrEmpty(singleTrackingIdObj.totalEstimatedCost) ? singleTrackingIdObj.totalEstimatedCost : ''; // ommited space
                oContact.estimatedRecyclingCharge = !isNullOrEmpty(singleTrackingIdObj.estimatedRecyclingCharge) ? singleTrackingIdObj.estimatedRecyclingCharge : ''; // ommited space

                // pending fields mapping for CT end
                // added by ali start 25-3-19 prepare json comment for case Item fields
                var commentJsonCaseItems = {};
                commentJsonCaseItems.manufactureName = !isNullOrEmpty(singleTrackingIdObj.manufactureName) ? singleTrackingIdObj.manufactureName : '';
                commentJsonCaseItems.recycleBuy = !isNullOrEmpty(singleTrackingIdObj.recycleBuy) ? singleTrackingIdObj.recycleBuy : '';
                commentJsonCaseItems.recycleSell = !isNullOrEmpty(singleTrackingIdObj.recycleSell) ? singleTrackingIdObj.recycleSell : '';
                commentJsonCaseItems.transportBuy = !isNullOrEmpty(singleTrackingIdObj.transportBuy) ? singleTrackingIdObj.transportBuy : '';
                commentJsonCaseItems.transportSell = !isNullOrEmpty(singleTrackingIdObj.transportSell) ? singleTrackingIdObj.transportSell : '';
                commentJsonCaseItems.channelBuy = !isNullOrEmpty(singleTrackingIdObj.channelBuy) ? singleTrackingIdObj.channelBuy : '';
                commentJsonCaseItems.channelSell = !isNullOrEmpty(singleTrackingIdObj.channelSell) ? singleTrackingIdObj.channelSell : '';
                commentJsonCaseItems.SizeAlias = !isNullOrEmpty(singleTrackingIdObj.SizeAlias) ? singleTrackingIdObj.SizeAlias : ''; // might be modified 
                oContact.jsonCommentCaseItem = commentJsonCaseItems;
                // added by ali end 25-3-19 prepare json comment for case Items fields
                // new fields mapping for Case Item start

                oContact.isangeritem = !isNullOrEmpty(singleTrackingIdObj.isDangerItem) ? singleTrackingIdObj.isDangerItem : '';
                oContact.caseitemsizeid = !isNullOrEmpty(singleTrackingIdObj.caseitemsizeid) ? singleTrackingIdObj.caseitemsizeid : '';
                oContact.caseitemsizename = !isNullOrEmpty(singleTrackingIdObj.caseitemsizename) ? singleTrackingIdObj.caseitemsizename : '';
                oContact.caseitemconditionid = !isNullOrEmpty(singleTrackingIdObj.caseitemconditionid) ? singleTrackingIdObj.caseitemconditionid : '';
                oContact.caseitemcondition = !isNullOrEmpty(singleTrackingIdObj.caseitemcondition) ? singleTrackingIdObj.caseitemcondition : '';


                // new fields mapping for Case Item end


                oContact.contactname = !isNullOrEmpty(singleTrackingIdObj.primaryUserFirstName) ? singleTrackingIdObj.primaryUserFirstName : '';
                oContact.contactlastname = !isNullOrEmpty(singleTrackingIdObj.primaryUserLastName) ? singleTrackingIdObj.primaryUserLastName : '';
                oContact.mobilephone = !isNullOrEmpty(singleTrackingIdObj.primaryContactNumber) ? singleTrackingIdObj.primaryContactNumber : '';
                oContact.email = !isNullOrEmpty(singleTrackingIdObj.primaryEmailAddress) ? singleTrackingIdObj.primaryEmailAddress : '';
                oContact.altname = !isNullOrEmpty(singleTrackingIdObj.secondaryUserName) ? singleTrackingIdObj.secondaryUserName : '';
                oContact.altmobilephone = !isNullOrEmpty(singleTrackingIdObj.secondaryUserContactNumber) ? singleTrackingIdObj.secondaryUserContactNumber : '';
                oContact.altemail = !isNullOrEmpty(singleTrackingIdObj.secondaryUserEmailAddress) ? singleTrackingIdObj.secondaryUserEmailAddress : '';
                oContact.primaryothercontactnumber = !isNullOrEmpty(singleTrackingIdObj.primaryContactNumberOther) ? singleTrackingIdObj.primaryContactNumberOther : '';
                oContact.postcodeaddress = !isNullOrEmpty(singleTrackingIdObj.zip) ? singleTrackingIdObj.zip : '';
                oContact.pickupaddress1 = !isNullOrEmpty(singleTrackingIdObj.addressLine1) ? singleTrackingIdObj.addressLine1 : '';
                oContact.pickupaddress2 = !isNullOrEmpty(singleTrackingIdObj.addressLine2) ? singleTrackingIdObj.addressLine2 : '';
                oContact.pickupcity = !isNullOrEmpty(singleTrackingIdObj.city) ? singleTrackingIdObj.city : '';
                oContact.pickupstate = !isNullOrEmpty(singleTrackingIdObj.state) ? singleTrackingIdObj.state : '';
                oContact.pickupcountry = !isNullOrEmpty(singleTrackingIdObj.country) ? singleTrackingIdObj.country : '';
                // oContact.pickuutimefrom = singleTrackingIdObj.pickuutimefrom;
                // oContact.pickuutimeto = singleTrackingIdObj.pickuutimeto;
                // 20-27,32-37,39,81,87-91    excel rows added
                oContact.programId = singleTrackingIdObj.programId;
            //    oContact.primaryothercontactnumber = !isNullOrEmpty(singleTrackingIdObj.primaryContactNumberOther) ? singleTrackingIdObj.primaryContactNumberOther : '';
                // mapping for caseitem
                if (singleTrackingIdObj.quantity) {
                    oContact.quantity = singleTrackingIdObj.quantity
                }
                if (singleTrackingIdObj.weight) {
                    oContact.weight = singleTrackingIdObj.weight
                }
                if (singleTrackingIdObj.height) {
                    oContact.height = singleTrackingIdObj.height
                }
                if (singleTrackingIdObj.depth) {
                    oContact.depth = singleTrackingIdObj.depth
                }
                if (singleTrackingIdObj.width) {
                    oContact.width = singleTrackingIdObj.width
                }
                if (singleTrackingIdObj.itemName) {
                    oContact.itemName = singleTrackingIdObj.itemName
                }
                log.debug({
                    title: 'prepareJSON() :: case item',
                    details: JSON.stringify(oContact.programId)
                });
                // added by ali end 
               // added by ali start 3-5-2019 IHD-36
               var CTsArray = [];
               var itemArray = [];
               var transportSupp;
               for(j=0;j<singleTrackingIdObj.requestSections.length;j++)
               {  
                   var tempCTs = {};
                   tempCTs.sectionId=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].sectionId) ? singleTrackingIdObj.requestSections[j].sectionId : '';
                   tempCTs.sectionName=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].sectionName) ? singleTrackingIdObj.requestSections[j].sectionName : '';                 
                   // added by ali start IHD-32
                   transportSupp=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].transportSupplier) ? singleTrackingIdObj.requestSections[j].transportSupplier : '';
                   log.debug("transportSupplier= ",  transportSupp);
                   if(transportSupp!='')
                    { var transportSupplierArray = transportSupp[0].split("|");
                      var transportSupplierObj ={};
                      transportSupplierObj.supplier=transportSupplierArray[0];
                      transportSupplierObj.connote=transportSupplierArray[1];
                      transportSupplierObj.skidsGuess=transportSupplierArray[2];
                      transportSupplierObj.palletsGuess=transportSupplierArray[3];
                      transportSupplierObj.boxesGuess=transportSupplierArray[4];
                      transportSupplierObj.satchelsGuess=transportSupplierArray[5];
                      transportSupplierObj.freeStandGuess|=transportSupplierArray[6];
                      transportSupplierObj.note=transportSupplierArray[7];
                      tempCTs.transportSupplier=transportSupplierObj;
                    } else {tempCTs.transportSupplier='';}
                    log.debug("transportSupplier after parsed JSon= ",  tempCTs.transportSupplier);
                   // added by ali end IHD-32
                   tempCTs.transportServiceLevelName=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].transportServiceLevelName) ? singleTrackingIdObj.requestSections[j].transportServiceLevelName : '';
                   tempCTs.recyclingSupplier=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].recyclingSupplier) ? singleTrackingIdObj.requestSections[j].recyclingSupplier : '';
                   tempCTs.recyclingServiceLevelName=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].recyclingServiceLevelName) ? singleTrackingIdObj.requestSections[j].recyclingServiceLevelName : '';
                  tempCTs.dropPointSupplier=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].dropPointSupplier) ? singleTrackingIdObj.requestSections[j].dropPointSupplier : '';
                   tempCTs.dropPointServiceLevelName=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].dropPointServiceLevelName) ? singleTrackingIdObj.requestSections[j].dropPointServiceLevelName : '';
                   tempCTs.pickupInstruction=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].pickupInstruction) ? singleTrackingIdObj.requestSections[j].pickupInstruction : '';
                   tempCTs.pickupTimeFrom=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].pickupTimeFrom) ? singleTrackingIdObj.requestSections[j].pickupTimeFrom : '';
                   tempCTs.pickupTimeTo=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].pickupTimeTo) ? singleTrackingIdObj.requestSections[j].pickupTimeTo : '';
                   tempCTs.comments=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].comments) ? singleTrackingIdObj.requestSections[j].comments : '';
                   tempCTs.logisticDirection=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].logisticDirection) ? singleTrackingIdObj.requestSections[j].logisticDirection : '';
                   tempCTs.customerEstimateWeight=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].customerEstimateWeight) ? singleTrackingIdObj.requestSections[j].customerEstimateWeight : '';
                   tempCTs.iaDeclaredWeight=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].iaDeclaredWeight) ? singleTrackingIdObj.requestSections[j].iaDeclaredWeight : '';
                   tempCTs.estimatedNumberOfSatchels=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].estimatedNumberOfSatchels) ? singleTrackingIdObj.requestSections[j].estimatedNumberOfSatchels : 0;
                   tempCTs.estimatedNumberOfBoxes=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].estimatedNumberOfBoxes) ? singleTrackingIdObj.requestSections[j].estimatedNumberOfBoxes : 0;
                   tempCTs.estimatedNumberOfFreeStandingItems=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].estimatedNumberOfFreeStandingItems) ? singleTrackingIdObj.requestSections[j].estimatedNumberOfFreeStandingItems : 0;
                   tempCTs.estimatedNumberOfPallets=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].estimatedNumberOfPallets) ? singleTrackingIdObj.requestSections[j].estimatedNumberOfPallets : 0;
                   tempCTs.confirmedNumberOfSatchels=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].confirmedNumberOfSatchels) ? singleTrackingIdObj.requestSections[j].confirmedNumberOfSatchels : 0;
                   tempCTs.confirmedNumberOfBoxes=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].confirmedNumberOfBoxes) ? singleTrackingIdObj.requestSections[j].confirmedNumberOfBoxes : '';
                  tempCTs.confirmedNumberOfFreeStandingItems=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].confirmedNumberOfFreeStandingItems) ? singleTrackingIdObj.requestSections[j].confirmedNumberOfFreeStandingItems : 0;
                   tempCTs.confirmedNumberOfPallets=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].confirmedNumberOfPallets) ? singleTrackingIdObj.requestSections[j].confirmedNumberOfPallets : 0;
                   tempCTs.estimatedFreightCharge=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].estimatedFreightCharge) ? singleTrackingIdObj.requestSections[j].estimatedFreightCharge : '';
                   tempCTs.estimatedFuelLevyCharge=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].estimatedFuelLevyCharge) ? singleTrackingIdObj.requestSections[j].estimatedFuelLevyCharge : '';
                   tempCTs.estimatedAdditionalFees=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].estimatedAdditionalFees) ? singleTrackingIdObj.requestSections[j].estimatedAdditionalFees : '';
                   tempCTs.totalEstimatedCost=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].totalEstimatedCost) ? singleTrackingIdObj.requestSections[j].totalEstimatedCost : '';
                   tempCTs.estimatedRecyclingCharge=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].estimatedRecyclingCharge) ? singleTrackingIdObj.requestSections[j].estimatedRecyclingCharge : '';
                   tempCTs.estimatedDropPointCharge=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].estimatedDropPointCharge) ? singleTrackingIdObj.requestSections[j].estimatedDropPointCharge : '';
                  var jsonCTCmment={};
                  jsonCTCmment.sectionId = !isNullOrEmpty(singleTrackingIdObj.requestSections[j].sectionId) ? singleTrackingIdObj.requestSections[j].sectionId : '';
                  jsonCTCmment.location = !isNullOrEmpty(singleTrackingIdObj.location) ? singleTrackingIdObj.location : '';
                  jsonCTCmment.latitude = !isNullOrEmpty(singleTrackingIdObj.latitude) ? singleTrackingIdObj.latitude : '';
                  jsonCTCmment.longtitude = !isNullOrEmpty(singleTrackingIdObj.longtitude) ? singleTrackingIdObj.longtitude : '';
                  jsonCTCmment.addressTypeId = !isNullOrEmpty(singleTrackingIdObj.addressTypeId) ? singleTrackingIdObj.addressTypeId : '';
                  tempCTs.jsonCommentCT=jsonCTCmment;     // for CT comment Json        
              
               for(i=0;i<singleTrackingIdObj.requestSections[j].requestSectionItems.length;i++)
                {  
                var temp = {};
                var isDangerItem = singleTrackingIdObj.requestSections[j].requestSectionItems[i].isDangerItem;
                temp.requestItemId=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].requestItemId) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].requestItemId : '';
                temp.quantity=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].quantity) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].quantity : '';
              //  temp.isDangerItem=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].isDangerItem) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].isDangerItem : '';
              temp.isDangerItem=(isDangerItem==false || true ) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].isDangerItem : '';
            //    temp.isDataEraseItem=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].isDataEraseItem) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].isDataEraseItem : '';
                temp.itemSizeId=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemSizeId) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemSizeId : '';
                temp.itemSizeName=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemSizeName) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemSizeName : '';
                temp.itemConditionId=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemConditionId) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemConditionId : '';
                temp.itemCondition=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemCondition) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemCondition : '';
                temp.weight=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].weight) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].weight : '';
                temp.height=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].height) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].height : '';
                temp.depth=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].depth) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].depth : '';
                temp.width=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].width) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].width : '';
                temp.itemName=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemName) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemName : '';
                temp.manufactureId=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].manufactureId) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].manufactureId : '';
                temp.manufactureName=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].manufactureName) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].manufactureName : '';
              //  temp.itemRecycleBuy=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemRecycleBuy) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemRecycleBuy : '';
              //  temp.itemRecycleSell=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemRecycleSell) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemRecycleSell : '';
             //   temp.itemTransportBuy=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportBuy) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportBuy : '';
             //   temp.itemTransportSell=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportSell) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportSell : '';
             //   temp.itemChannelBuy=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemChannelBuy) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemChannelBuy : '';
             //   temp.itemTransportSell=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportSell) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportSell : '';
                temp.sizeAlias=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].sizeAlias) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].sizeAlias : '';
           //     temp.packageDescription=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].packageDescription) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].packageDescription : '';
             //   temp.dispatchTypeName=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].dispatchTypeName) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].dispatchTypeName : '';
                temp.dispatchDate=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].dispatchDate) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].dispatchDate : '';
                temp.sponsorTags=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].sponsorTags) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].sponsorTags : '';
                temp.sponsors=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].sponsors) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].sponsors : '';
                temp.conNote=!isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].conNote) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].conNote : '';
                itemArray.push(temp);
                // commented CTs and item fields are not in UE and in NS adding
               // for case comment Json start
               var commentJsonCaseItems = {};
                commentJsonCaseItems.manufactureName = !isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].manufactureName) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].manufactureName : '';
                commentJsonCaseItems.recycleBuy = !isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemRecycleBuy) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemRecycleBuy : '';
                commentJsonCaseItems.recycleSell = !isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemRecycleSell) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemRecycleSell : '';
                commentJsonCaseItems.transportBuy = !isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportBuy) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportBuy : '';
                commentJsonCaseItems.transportSell = !isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportSell) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemTransportSell : '';
                commentJsonCaseItems.channelBuy = !isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemChannelBuy) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemChannelBuy : '';
                commentJsonCaseItems.channelSell = !isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemChannelBuy) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].itemChannelBuy : '';
                commentJsonCaseItems.SizeAlias = !isNullOrEmpty(singleTrackingIdObj.requestSections[j].requestSectionItems[i].sizeAlias) ? singleTrackingIdObj.requestSections[j].requestSectionItems[i].sizeAlias : ''; // might be modified 
                temp.jsonCommentCaseItem = commentJsonCaseItems;
                // for case comment Json end
               
                }
                tempCTs.CTItems=itemArray;
                CTsArray.push(tempCTs);
               }
               log.debug('items array= ', JSON.stringify(itemArray)+":: CT array="+JSON.stringify(CTsArray));

               // added by ali end 3-5-2019 IHD-36
                //prepare case
                var itemList = singleTrackingIdObj.productsList
                if (!isNullOrEmpty(itemList)) {
                    for (var i = 0; i < itemList.length; i++) {
                        var oItem = {};
                        oItem.text = itemList[i].productName;
                        oItem.quantity = itemList[i].quantity;
                        aItem.push(oItem);

                    }
                }

                oJSON.contact = oContact;
                oJSON.CTsItemsArrays = CTsArray; // adedd by ali raza IHD-36
                oJSON.items = aItem;
                

               
                return oJSON;

            } catch (e) {
                log.error({
                    title: 'prepareJSON() :: Error Message',
                    details: e.message
                });
                return;
            }
        }

        function createCase(oJSON, trackingId) {
            try {
                log.debug({
                    title: 'prepareJSON() :: case item ',
                    details: JSON.stringify(oJSON)
                });
                var obj = oJSON.contact
                log.debug({
                    title: 'prepareJSON() :: case item: ' + oJSON['contact'].confirmednumberofsatchels,
                    details: oJSON['contact'].contactname
                });

                var fileRecordData = record.create({
                    type: "customrecord_case",
                    isDynamic: true,
                });
                // added by ali start IHD-36
                fileRecordData.setValue({
                    fieldId: "custrecord_case_home_tech_code",
                    value: oJSON['contact'].homeTechCode,
                    ignoreFieldChange: true
                });
                // added by ali end IHD-36
                //   added by ali start
                fileRecordData.setValue({
                    fieldId: "custrecord_case_customer_case_number",
                    value: trackingId,
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_case_program",
                    value: oJSON['contact'].programId,
                    ignoreFieldChange: true
                });
                // case new fields set start
                fileRecordData.setValue({
                    fieldId: "custrecord_case_support_executive_code",
                    value: oJSON['contact'].supportexecutivecode,
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_case_enterprise_education",
                    value: oJSON['contact'].enterpriseeducation, 
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_case_packaging_required",
                    value: oJSON['contact'].packagingrequired,
                    ignoreFieldChange: true
                });
                // case new fields set end
                // added by ali end
                fileRecordData.setValue({
                    fieldId: "custrecord_case_status",
                    value: caseStatus,
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_case_creation_method",
                    value: caseCreationMethod,
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_program_customer",
                    value: CUSTOMER_ID,
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_case_program",
                    value: PROGRAM_ID,
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_case_360_json",
                    value: JSON.stringify(oJSON),
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_case_order_type",
                    value: ORDER_TYPE_RETURN,
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_case_order_source",
                    value: HC_ORDER_SOURCE_ONLINE,
                    ignoreFieldChange: true
                });
                var id = fileRecordData.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.debug("case id: ", id);
            } catch (e) {
                log.error({
                    title: 'createCase() :: Error Message',
                    details: e.message
                });

                var fileRecordData = record.create({
                    type: "customrecord_qra_integration_errs_detail",
                    isDynamic: true,
                });
                fileRecordData.setValue({
                    fieldId: "name",
                    value: trackingId,
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_qra_error_detail",
                    value: e.message,
                    ignoreFieldChange: true
                });
                fileRecordData.setValue({
                    fieldId: "custrecord_qra_json",
                    value: JSON.stringify(oJSON),
                    ignoreFieldChange: true
                });
                var id = fileRecordData.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                return;
            }

        }

        function getNumberToDate(numDate) {
            var d = new Date(1000 * numDate);
            var date = d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
            return date;
        }

        function getYesterdaysDate() {
            var date = new Date();
            date.setDate(date.getDate() - 1);
            return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
        }

        function isNullOrEmpty(valueStr) {
            return (valueStr == null || valueStr == "" || valueStr == undefined);
        }


        // added by ali 3-2-2019 start
        function getQraExistingIds(trackingIds) {
            try {
                log.debug('getQraExistingIds() ', "Start");
                var dataArr = [];
                var arrFilters = [];
                for (var i = 0; i < trackingIds.length; i++) {
                    if (!isNullOrEmpty(trackingIds[i])) {
                        arrFilters.push(['custrecord_case_customer_case_number', 'is', trackingIds[i]]);
                        arrFilters.push('or');

                    }
                }
                arrFilters.pop();
                log.debug('arrFilters: ', JSON.stringify(arrFilters))
                var searchCreate = search.create({
                    type: "customrecord_case",
                    filters: arrFilters,
                    columns: [
                        search.createColumn({
                            name: 'custrecord_case_customer_case_number'
                        }),
                        search.createColumn({
                            name: 'name'
                        })
                    ],
                });
                var searchRun = searchCreate.run();
                var searchResult = searchRun.getRange({
                    start: 0,
                    end: 1000
                });
                if (searchResult) {
                    log.debug('searchResult: ', JSON.stringify(searchResult));
                    for (var i = 0; i < searchResult.length; i++) {
                        dataArr.push(searchResult[i].getValue('custrecord_case_customer_case_number'));
                    }
                }
                log.debug('getQraExistingIds() ', "End");
                return dataArr;
            } catch (e) {
                log.error("getQraExistingIds() :: ERROR ", e);
            }
        }
        // aded by ali 3-4-2019 end


        return {
            execute: onRequest        

        };
    });

