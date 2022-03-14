sap.ui.define([
    'tcs/fin/ap/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox',
    'sap/m/MessageToast',
    'sap/ui/core/Fragment'
], function(BaseController, JSONModel, MessageBox, MessageToast, Fragment) {
    'use strict';
    return BaseController.extend("tcs.fin.ap.controller.Add",{
        //This is our app controller 😊
        onInit: function(){
            var oModel = new JSONModel();
            oModel.setData({
                "productData": {
                    "PRODUCT_ID" : "",
                    "TYPE_CODE" : "PR",
                    "CATEGORY" : "Notebooks",
                    "NAME" : "",
                    "DESCRIPTION" : "",
                    "SUPPLIER_ID" : "0100000051",
                    "SUPPLIER_NAME" : "TECUM",
                    "TAX_TARIF_CODE" : "1",
                    "MEASURE_UNIT" : "EA",
                    "PRICE" : "0.00",
                    "CURRENCY_CODE" : "USD",
                    "DIM_UNIT" : "CM"
                },
                "SUPPLIER_NAME": ""
            });
            this.getView().setModel(oModel,"local");
            this.oLocalModel = oModel;
        },
        onSave: function(){
            // Get the payload from local model
            var payload = this.oLocalModel.getProperty("/productData");
            // Validate the data*
            if(payload.PRODUCT_ID === "" || payload.NAME === ""){
                MessageBox.error("Input Validation failed");
                return;
            }
            // Get the access of ODataModel (which is default model @ app level)
            var oDataModel = this.getView().getModel();
            // Fire the OData create (POST) request on ProductSet with our payload
            if(this.mode === 'create'){
                oDataModel.create("/ProductSet", payload, {
                    // Handle the response using callbacks - ALL IS WELL!
                    success: function(){
                        MessageToast.show("Yo Amigo!! you all did it 😁");
                    },
                    // Handle the response using callbacks - ERROR
                    error: function(oError){
                        MessageBox.error(JSON.parse(oError.responseText).error.innererror.errordetails[0].message);
                    }
                });
            }else{
                //here we need to update the data by its key
                //Step 1: Read the payload which needs to be updated
                var payload = this.oLocalModel.getProperty("/productData");
                var { PRODUCT_ID } = payload;
                //Step 2: Prepare path for Single Entity which needs to be updated
                var sPath = "/ProductSet('" +  PRODUCT_ID + "')";
                //Step 3: Make a Request to backend for update
                oDataModel.update(sPath,payload,{
                    success: function(){
                        //Step 4: Handle the response
                        MessageToast.show("Hey Amigo! we have loaded the product");
                    },
                    error: function(oError){
                        //Step 4: Handle the response
                        MessageToast.show(JSON.parse(oError.responseText).error.innererror.errordetails[0].message);
                    }
                })
                
            }
                      
            
        },
        oField: null,
        oSupplierPopup: null,
        onF4Supplier: function(oEvent){
            //Take the snapshot of the object of the field on which F4 was pressed
            this.oField = oEvent.getSource();
            //create a local variable so we can scope in this pointer inside promise
            var that = this;
            //check our global object to avoid piling up all popups
            if(!this.oSupplierPopup){
                //load the fragment
                Fragment.load({
                    name: 'tcs.fin.ap.fragments.popup',
                    type: 'XML',
                    controller: this
                }).then(function(oDialog){
                    //callback for having popup
                    that.oSupplierPopup = oDialog;
                    that.getView().addDependent(that.oSupplierPopup);
                    that.oSupplierPopup.setTitle("Select Supplier");
                    that.oSupplierPopup.setMultiSelect(false);
                    that.oSupplierPopup.bindAggregation("items",{
                        path: '/SupplierSet',
                        template: new sap.m.DisplayListItem({
                            label: '{BP_ID}',
                            value: '{COMPANY_NAME}'
                        })
                    });
                    that.oSupplierPopup.open();
                });
            }else{
                this.oSupplierPopup.open();
            }
            //MessageToast.show("This function is under construction");
        },
        onItemSelect: function(oEvent){
            debugger;
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var sId = oSelectedItem.getLabel();
            var sSupplierName = oSelectedItem.getValue();
            this.oField.setValue(sId);
            this.oLocalModel.setProperty("/SUPPLIER_NAME", sSupplierName);
        },
        mode: 'create',
        setMode: function(sMode){
            this.mode = sMode;
            if(this.mode === 'create'){
                this.getView().byId("idSave").setText("Save");
                this.getView().byId("name").setEnabled(true);
                this.getView().byId("idDelete").setEnabled(false);
            }else{
                this.getView().byId("idSave").setText("Update");
                this.getView().byId("name").setEnabled(false);
                this.getView().byId("idDelete").setEnabled(true);
            }
        },
        onLoadExp: function(){
            //Step 1: Read the product Category from dropdown
            var sCategory = this.oLocalModel.getProperty("/productData/CATEGORY");
            //Step 2: Get The Odata Model object
            var oDataModel = this.getView().getModel();
            //BONUS: Show a loading indicator on view
            this.getView().setBusy(true);
            //Step 3: Call the Function import - callFunction API in model
            var that = this; //https://www.youtube.com/watch?v=RMsTYQe_3Jg
            oDataModel.callFunction("/GetMostExpensiveProduct",{
                urlParameters:{
                    I_CATEGORY: sCategory
                },
                success: function(data){
                    //Step 4: Handle the response
                    that.oLocalModel.setProperty("/productData",data);
                    that.setMode('update');
                    that.getView().setBusy(false);
                },
                error: function(oError){
                    MessageBox.error("An Error occcurred");
                    that.getView().setBusy(false);
                }
            })
            

        },
        onDelete: function(){
            //Step 1: Ask a confirmation
            MessageBox.confirm("Do you want to delete this product?",{
                //passing controller object to the event handler
                onClose: this.onConfirmDelete.bind(this)
            });           

        },
        onConfirmDelete: function(stats){
            //here you cannot access this pointer, in order to allow access of
            //this pointer as controller object the caller has to pass it via
            //special syntax bind(this)
            if(stats === "OK"){
                //If confirmed, call delete function
                //Step 1: Get OData Model object
                var oDataModel = this.getView().getModel();
                //Step 2: Fire Delete Request for the product Id
                var { PRODUCT_ID } = this.oLocalModel.getProperty("/productData");
                var sPath = "/ProductSet('" + PRODUCT_ID + "')";
                //Step 3: Trigger delete request
                var that = this;
                oDataModel.remove(sPath,{
                    success: function(){
                        MessageToast.show("Deleted has been done");
                        that.onClear();
                    }
                });
            }
        },
        onSubmit: function(oEvent){
            //Step 1: What is the value entered by user on the input field
            var sValue = oEvent.getParameter("value");
            //Step 2: Get The OData Model object
            var oDataModel = this.getView().getModel();
            //Step 3: Preapre the End Point
            var sPath = "/ProductSet('" + sValue.toUpperCase() + "')";
            //Step 4: Make the GET call - Single product Data - /ProductSet('FB-1000')
            var that = this;
            oDataModel.read(sPath,{
                success: function(data){
                    //Step 5: Handle the response - SUCCESS, ERROR
                    that.oLocalModel.setProperty("/productData",data);
                    that.setMode('update');
                },
                error: function(oError){
                    //Step 5: Handle the response - SUCCESS, ERROR
                    MessageBox.error(JSON.parse(oError.responseText).error.innererror.errordetails[0].message);
                    that.onClear();
                    that.setMode('create');
                }
            });
            
        },
        onClear: function(){
            //reset data in the local model since its a 2 way binding
            //the data will be cleared on UI as well
            this.oLocalModel.setProperty("/productData",{
                "PRODUCT_ID" : "",
                "TYPE_CODE" : "PR",
                "CATEGORY" : "Notebooks",
                "NAME" : "",
                "DESCRIPTION" : "",
                "SUPPLIER_ID" : "0100000051",
                "SUPPLIER_NAME" : "TECUM",
                "TAX_TARIF_CODE" : "1",
                "MEASURE_UNIT" : "EA",
                "PRICE" : "0.00",
                "CURRENCY_CODE" : "USD",
                "DIM_UNIT" : "CM"
            });
            this.setMode('create');
        }
    });
});