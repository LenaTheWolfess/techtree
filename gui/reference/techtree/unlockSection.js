class UnlockSection extends TechtreeUtils
{
	constructor()
	{
		super();
		Engine.GetGUIObjectByName("unlock_caption").caption = "Unlocks Technologies";
		Engine.GetGUIObjectByName("unlock_unit_caption").caption = "Unlocks Units";
	}
	
	predraw(page, row, spasing, selectedTech)
	{
		let res = {"row": row, "spasing": spasing};
		res = this.predrawUnlocks(page, res, selectedTech);
		res = this.predrawUnits(page, res, selectedTech);
	}
	
	draw(page, civCode, techs, data)
	{
		if (!techs)
			return;
		this.drawUnlocks(page, techs.unlocks, data.techs[civCode], civCode);
		this.drawUnits(techs.units, data.units);
	}
	
	drawUnlocks(page, unlocks, data, civCode)
	{
		const isHide = !unlocks || !unlocks.length;
		Engine.GetGUIObjectByName("unlock_caption").hidden = isHide;
		if (isHide)
			return;
		let i = 0;
		for (let tech of unlocks)
		{
			const thisEle = Engine.GetGUIObjectByName("unlock["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+civCode+"\" has more techs than can be supported by the current GUI layout");
				break;
			}
			let child = data[tech];
			
			thisEle.sprite = this.IconPath + child.icon;
			thisEle.tooltip = this.FontType +  child.name.generic + '[/font]\n' + child.description;
			const that = page;
			thisEle.onPress = function() {
				that.selectTech(child.name.internal);
				that.draw(civCode);
			}
			thisEle.hidden = false;
			++i;
		}
	}
	
	drawUnits(units, data)
	{
		const isHide = !units || !units.length;
		Engine.GetGUIObjectByName("unlock_unit_caption").hidden = isHide;
		if (isHide)
			return;
		let i = 0;
		for (let unit of units)
		{
			const thisEle = Engine.GetGUIObjectByName("unlock_unit["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+civCode+"\" has more techs than can be supported by the current GUI layout");
				break;
			}
			let child = data[unit];
			
			thisEle.sprite = this.IconPath + child.icon;
			thisEle.tooltip = this.FontType +  child.name.generic + '[/font]\n(' + child.name.specific+")";
			EntityBox.setViewerOnPress(thisEle, unit);
			thisEle.hidden = false;
			++i;
		}
	}
	
	predrawUnlocks(page, res, selectedTech)
	{
		const initIconSize = this.getInitIconSize();
		const rowSize = initIconSize.top - initIconSize.bottom;
		
		let row = res.row;
		let spasing = res.spasing;
		
		let root = Engine.GetGUIObjectByName("unlock_caption");
		let size = root.size;
		
		root.size = this.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
		spasing += ((size.bottom - size.top) / 2);
		
		let i = 0;
		if (selectedTech && selectedTech.unlocks.length > 0) {
			let shift = selectedTech.unlocks.length / 2;
			for (let tech of selectedTech.unlocks) {
				const thisEle = Engine.GetGUIObjectByName("unlock["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more starting techs than can be supported by the current GUI layout");
					break;
				}
				// Set start tech icon
				this.setIconRowSize(thisEle, initIconSize, i, shift, row, spasing);
				++i;
			}
			row++;
		}
		for (let x = i; x < this.maxItems; ++x) {
			Engine.GetGUIObjectByName("unlock["+x+"]_icon").hidden = true;
		}
		return {"row" : row, "spasing": spasing};
	}
	
	predrawUnits(page, res, selectedTech)
	{
		const initIconSize = this.getInitIconSize();
		const rowSize = initIconSize.top - initIconSize.bottom;
		
		let row = res.row;
		let spasing = res.spasing;
		
		let root = Engine.GetGUIObjectByName("unlock_unit_caption");
		let size = root.size;
		
		root.size = this.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
		spasing += (size.bottom - size.top) / 2;
		
		let i = 0;
		if (selectedTech && selectedTech.units.length > 0) {
			let shift = selectedTech.units.length / 2;
			for (let tech of selectedTech.units) {
				let thisEle = Engine.GetGUIObjectByName("unlock_unit["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more starting techs than can be supported by the current GUI layout");
					break;
				}
				// Set start tech icon
				this.setIconRowSize(thisEle, initIconSize, i, shift, row, spasing);
				++i;
			}
		}
		
		for (let x = i; x < this.maxItems; ++x) {
			Engine.GetGUIObjectByName("unlock_unit["+x+"]_icon").hidden = true;
		}
		return {"row" : row, "spasing": spasing};
	}
}