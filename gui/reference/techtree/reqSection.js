class ReqSection extends TechtreeUtils
{
	constructor()
	{
		super();
		Engine.GetGUIObjectByName("req_caption").caption = "Requirements";
		Engine.GetGUIObjectByName("req_struct_caption").caption = "Researched in/by";
	}
	
	predraw(page, row, spasing, selectedTech, civCode)
	{
		let res = {"row": row, "spasing": spasing};
		res = this.predrawStruct(page, res, selectedTech, civCode);
		res = this.predrawReq(page, res, selectedTech, civCode);
		return res;
	}
	
	draw(page, civCode, techs, data)
	{
		if (!techs)
			return;
		this.drawStruct(page, techs.buildings, data.structures, civCode);
		this.drawReq(page, techs.require, data.techs[civCode], civCode);
	}
	
	drawStruct(page, buildings, data, civCode)
	{
		let i = 0;
		for (let struct of buildings)
		{
			let thisEle = Engine.GetGUIObjectByName("req_struct["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+civCode+"\" tech can be researched in more structures than can be supported by the current GUI layout");
				break;
			}
			const child = data[struct];
			
			thisEle.sprite = this.IconPath  + child.icon;
			thisEle.tooltip = this.FontType + child.name.generic + '[/font]\n(' + (child.name.specific || "")+")";
			const that = page;
			thisEle.onPress = function() {
				that.selectStruct(struct);
				that.draw(civCode);
			}
			thisEle.hidden = false;
			++i;
		}
	}
	
	drawReq(page, require, data, civCode)
	{
		let i = 0;
		for (let tech of require)
		{
			const thisEle = Engine.GetGUIObjectByName("req["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+civCode+"\" has more techs in phase " +
					  pha + " than can be supported by the current GUI layout");
				break;
			}
			const child = data[tech];
			if (!child) {
				warn("Technology not parsed for " + tech);
				continue;
			}
			thisEle.sprite = this.IconPath + child.icon;
			thisEle.tooltip = this.FontType +  child.name.generic + '[/font]\n' + (child.description || "");
			let that = page;
			thisEle.onPress = function() {
				that.selectTech(child.name.internal);
				that.draw(civCode);
			}
			thisEle.hidden = false;
			++i;
		}
	}
	
	predrawStruct(page, res, selectedTech, civCode)
	{
		const initIconSize = this.getInitIconSize();
		const rowSize = initIconSize.top - initIconSize.bottom;
		let row = res.row;
		let spasing = res.spasing;
		
		let root = Engine.GetGUIObjectByName("req_struct_caption");
		let size = root.size;
		root.size = this.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
		root.hidden = selectedTech.buildings.length == 0;
		spasing += ((size.bottom - size.top) / 2);
		let b = 0;
		if (selectedTech && selectedTech.buildings.length > 0) {
			let shift = selectedTech.buildings.length / 2;
			for (let struct of selectedTech.buildings) {
				let thisEle = Engine.GetGUIObjectByName("req_struct["+b+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" tech can be researched in more structures than can be supported by the current GUI layout");
					break;
				}
				this.setIconRowSize(thisEle, initIconSize, b, shift, row, spasing);
				b++;
			}
			row++;
		}
		for (let x = b; x < this.maxItems; ++x) {
			Engine.GetGUIObjectByName("req_struct["+x+"]_icon").hidden = true;
		}
		return {"row" : row, "spasing": spasing};
	}
	predrawReq(page, res, selectedTech, civCode)
	{		
		const initIconSize = this.getInitIconSize();
		const rowSize = initIconSize.top - initIconSize.bottom;
		
		let row = res.row;
		let spasing = res.spasing;
		
		let root = Engine.GetGUIObjectByName("req_caption");
		let size = root.size;
		root.size = this.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
		root.hidden = selectedTech.require.length == 0;
		spasing += ((size.bottom - size.top) / 2);
		// Draw req
		let i = 0;
		if (selectedTech && selectedTech.require.length > 0) {
			let shift = selectedTech.require.length / 2;
			for (let tech of selectedTech.require) {
				let thisEle = Engine.GetGUIObjectByName("req["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more starting techs than can be supported by the current GUI layout");
					break;
				}
				this.setIconRowSize(thisEle, initIconSize, i, shift, row, spasing);
				++i;
			}
			row++;
		}
		for (let x = i; x < this.maxItems; ++x) {
			Engine.GetGUIObjectByName("req["+x+"]_icon").hidden = true;
		}
		return {"row" : row, "spasing": spasing};
	}
}