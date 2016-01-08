import _ from "lodash";

import { Rect, Vec2 } from "shared/math";
import Message from "./message";

/**
 * Engine child
 */
export class Child {
  constructor(rect) {
    this.rect = rect;
  }

  /**
   * Render children to canvas
   * @param ctx Canvas context
   */
  draw(ctx) {}

  /**
   * Event listener
   * @param event Event Data
   */
  onEvent(event) {}

  /** Update childs */
  update() {}
}

/**
 * Array of elements
 */
export class Layer extends Child {
  /**
   * @param layout  Layout manager
   * @param maxSize Maximum size of container
   */
  constructor(layout=null, maxSize=new Rect()) {
    super(maxSize);

    // Children stack
    this.children = [];
    this.popup = null;

    // Spacing between items in  layout
    this.spacing = 5;
    this.layout = layout;

    // If false children wont receive any events
    this.eventForwarding = true;
  }

  /**
   * Reassign children positions after remove
   * and add in linear layouts
   * @private
   */
  _reloadLayout() {
    this.popup = null;
    if(this.layout) {
      _.each(this.children, (item, index) => {
        item.rect.xy = !index? [0, 0] : this.layout(item, this.children[index - 1]);
      });
    }
    return this;
  }

  /**
   * Set layer as popup object
   * @param popup  Popup, null if close popup
   * @returns {Layer}
   */
  showPopup(popup) {
    this.popup = popup;

    // Center popup on screen
    if(this.popup) {
      this.popup.layer = this;
      this.popup.rect.xy = [
          this.rect.w / 2 - this.popup.rect.w / 2
        , this.rect.h / 2 - this.popup.rect.h / 2
      ];
    }
    return this;
  }

  /**
   * Remove children from layer
   * @param child Child
   * @returns {Layer}
   */
  remove(child) {
    return _.remove(this.children, child) && this._reloadLayout();
  }

  /**
   * Remove all children
   * @returns {Layer}
   */
  clear() {
    this.children = [];
    this._reloadLayout();
    return this;
  }

  /**
   * Add child to layer
   * @param child Child
   * @param opts  Layout options
   * @returns {Child}
   */
  add(child, opts) {
    child.layer = this;

    // If layout is present use it to organise position
    if(this.layout) {
      // Optional layout params
      if(opts && opts.fill) {
        // Placement of child
        child.rect.wh = [
            ((this.rect.w * opts.fill[0]) || child.rect.w) - this.spacing * 2
          , ((this.rect.h * opts.fill[1]) || child.rect.h) - this.spacing * 2
        ];
      }

      // Remove optional opts
      if(!opts || opts.useLayout !== false) {
        opts = _.omit(opts, ["fill", "useLayout"]);

        // Use layout placement
        child.rect.xy = this.children.length || !_.isEmpty(opts)
          ? this.layout(child, _.last(this.children), opts)
          : [this.spacing, this.spacing];
      }
    }

    // Init children
    child.init && child.init();
    this.children.push(child);
    return child;
  }

  /** @inheritdoc */
  draw(context) {
    context.ctx.save();
    context.ctx.translate(this.rect.x, this.rect.y);

    _.each(this.children, child => {
      !child.disabled && child.draw(context);
    });
    if(this.popup) {
      context
        .fillWith("rgba(0, 0, 0, .75")
        .fillRect(this.rect);
      this.popup.draw(context);
    }

    context.ctx.restore();
  }

  /**
   * Redirect event to children
   * @param event Event
   */
  onEvent(event) {
    // TODO: use clone
    if(event.isMouseEvent()) {
      // If layer has rect property check mousePos
      if(this.rect.w * this.rect.h && !this.rect.contains(event.data))
        return false;

      // Clone event
      event = new Message(
          event.type
        , event.creator
        , event.data.clone().sub(this.rect)
        , event.finalCallback
      );
    }

    // Popup receive event first
    if(this.popup)
      this.popup.onEvent(event);

    // Children receive messages when forwarding is enabled
    else if(this.eventForwarding) {
      _.each(this.children, child => {
        // Ignore if disabled
        if(child.disabled)
          return;

        // Mark child as focus
        let result = child.onEvent(event);
        if(result === true) {
          // Remove and add to top
          this.children = _
            .chain(this.children)
            .tap(_.partialRight(_.remove, child))
            .unshift(child)
            .value();
          return false;
        }
      });
    }
  }

  /** Update children */
  update() {
    if(this.popup)
      this.popup.update();
    else
      _.each(this.children, child => {
        !child.disabled && child.update && child.update();
      });
  }
}

/** Horizontal/Vertical box */
Layer.HBox = function(child, prev) {
  return prev.rect.clone().add(new Vec2(prev.rect.w + this.spacing, 0)).xy;
};
Layer.VBox = function(child, prev) {
  return prev.rect.clone().add(new Vec2(0, prev.rect.h + this.spacing)).xy;
};

/** Border box */
Layer.BorderBox = function(child, prev, opts) {
  return [
      Math.max(0, Math.min(this.rect.w * opts.align[0] - child.rect.w / 2, this.rect.w - child.rect.w))
    , Math.max(0, Math.min(this.rect.h * opts.align[1] - child.rect.h / 2, this.rect.h - child.rect.h))
  ];
};

/**
 * TODO: Engine state
 * @class
 */
export class State extends Layer {
  /** Init state, register resources */
  init() {}
}