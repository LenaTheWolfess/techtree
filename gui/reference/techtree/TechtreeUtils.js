class TechtreeUtils {
	constructor()
	{
		
	}
	getInitIconSize() {
		return {
			"left": 0,
			"right": this.scale,
			"top": 0,
			"bottom": this.scale
		};
	}
	setIconRowSize(thisEle, initIconSize, i, shift, row, spasing)
	{
		const rowSize = initIconSize.top - initIconSize.bottom;
		let size = thisEle.size;
		size.left = initIconSize.right * (i - shift) + 4;
		size.right = initIconSize.right * (i + 1 - shift);
		size.bottom = initIconSize.bottom - (row * rowSize) + spasing;
		size.top = initIconSize.top - (row * rowSize) + spasing;
		thisEle.size = this.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
		thisEle.hidden = false;
		return thisEle.size;
	}
	setBottomTopSize(size, initIconSize, row, rowSize, spasing)
	{
		size.bottom = initIconSize.bottom - (row * rowSize) + spasing;
		size.top =  initIconSize.top - (row * rowSize) + spasing;
		return size;
	}
}

TechtreeUtils.prototype.scale = 40;
TechtreeUtils.prototype.spasing = 8;
TechtreeUtils.prototype.maxItems = 30;
TechtreeUtils.prototype.CostFree = "Cost free";
TechtreeUtils.prototype.IconPath = "stretched:session/portraits/";
TechtreeUtils.prototype.FontType = '[font="sans-bold-16"]';